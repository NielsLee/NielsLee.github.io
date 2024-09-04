---
title: '安卓InstantRun'
date: 2024-09-04T10:02:27+08:00
draft: false
tags: ['Android']
categories: ['技术']
image: ''
---
> 文章来源： https://medium.com/google-developers/instant-run-how-does-it-work-294a1633367f#.c088qhdxu 

从Medium上看到一篇接近八年前的技术文章，讲的东西却是我完全没了解过的，做技术真的是无穷无尽的知识要学。这篇文章一边对它做一个翻译，一边添加一些自己的理解。

# Instant Run 介绍
Instant Run是Android Studio上的一个新特性（至少在文章写出来的年代是的），它的功能是免去安卓代码修改以后的编译、安装步骤，直接将修改应用在调试设备上。

详细来讲，传统的安卓应用调试工作流是这样的：

**修改代码 -> 编译应用 -> 安装到设备上 -> 应用重启 -> 应用修改**
![](https://miro.medium.com/v2/resize:fit:720/format:webp/1*LNRCNJminORnljPEVmO5IQ.png)

每一次修改完代码，都要完成上面这一套工作流才能将修改应用到工程中。如果是小的工程还好说，大的工程每次编译就要耗时数十分钟，太浪费时间。因此我们在此处引入几种概念：
- Incremental build(增量构建)：只构建改动的部分，不会构建整个工程
- Hot Swap(热插拔): 增量构建的代码不需要重启App或者重启Activity就能够应用并生效。可以用于大部分类实现中的简单修改。

- Warm Swap（温插拔）: Activity需要重启才能应用修改。一般在资源文件有改动的时候会使用这种方式。

- Cold Swap（冷插拔）: App需要重启（仅仅是重启，并不需要重新安装）。当发生方法结构变化的时候需要用到（比如方法的签名发生变化、类的继承发生变化）。

![](https://miro.medium.com/v2/resize:fit:720/format:webp/1*Y-gIucAGyqQscMdXuHaSiA.png)

接下来我们会从实现的角度一一讲解这几种概念

# 构建

当我们运行或构建一个安卓项目的时候，安卓清单文件和Java文件的工作流程是这样的：
![](https://miro.medium.com/v2/resize:fit:720/format:webp/1*8Ti0IqtTEDEh8HoPcmvVZg.png)

其中，安卓项目的所有清单文件（包括依赖库的清单文件）会进行合并得到一个最终的清单文件。资源文件会通过AAPT(Android Asset Packaging Tool)进行打包，随后和合并后的清单文件一同放置到产物APK中；Java文件经过编译得到class文件后，会被再次处理得到适用于ART虚拟机的二进制产物dex文件，最后也被打包到APK中。

**但是，当我们第一次运行一个支持Instant Run的安卓工程后，流程发生了一些变化**：
![](https://miro.medium.com/v2/resize:fit:720/format:webp/1*U2tXGUWaeDU7L3u9Z_U0fw.png)

从这个图片中，我们可以看到相比之前，流程里面多了三处：

1. 多了一个Instant Run清单文件注入
2. Instant Run字节码被添加到了Java编译后的字节码中
3. appserver类定义和额外的Application类定义被添加到了dex文件中

按照原文的解释，新的Application类中注入了用于启动appserver的自定义class loader。清单文件的注入也是为了保证这个appserver能够顺利启动。如果在这个安卓工程中开发者自定义了Application，那么在编译过程中这段逻辑也会通过代理的方式工作在自定义的Application中。

至此，第一次运行后，Instant Run服务就算正式启动了。在此之后如果我们修改了代码并再次点击运行或调试，Instant Run服务就会尝试在三种启动方式中选择合适的一种来在尽可能缩短时间的前提下应用修改🎉。

不过，在应用 "即时运行 "更改之前，Android Studio会检查在启用了Instant Run的应用程序版本中运行的应用程序服务器是否有打开的Socket、以及APP是否在前台运行、APP的构建ID是否匹配Android Studio期望的ID。

# 热插拔（Hot Swap）

我们来看看热插拔是如何实现的。

![](https://miro.medium.com/v2/resize:fit:720/format:webp/1*_vixZYtLjc92xt2IjOGRZQ.png)

Android Studio在启动构建之前，会监控哪些文件被修改了，随后启动一个特定的Gradle脚本进行构建。这个特定的Gradle脚本会只针对有改动的文件进行修改，增量构建出有改动的dex文件。这些dex文件会被Android Studio部署到Instant Run在APP上运行的appserver上。

![](https://miro.medium.com/v2/resize:fit:720/format:webp/1*wqbGl-CwPN7L9IEigKeBiA.png)

随后，这些dex字节码文件会被appserver中自定义的class loader加载到APP中。还记得之前Instant Run注入到工程中的字节码吗？这部分字节码起到了一个hook的作用。后续当我们调用某个方法的时候，这些hook字节码会去appserver中查询是否存在更新的字节码，如果有的话，就用新的字节码来代替。站在开发者的角度来看，就是自己的新代码被“应用”了。

> **读完觉得这个方法很是鸡贼。不过我也理解了平时用Compose做开发的时候遇到的一个问题：热插拔更新了一些内容以后，如果杀掉进程重新启动APP，那些更新就不存在了，只能重新安装应用才能获取到更新。如果Compose的热更新也是同样的实现原理的话，那就说得清了：修改本身并没有应用在APP上，而是被一个动态的服务代理了，杀掉进程服务就不存在了，因此更新的部分也就不生效了💡**。

# 温插拔（Warm Swap）

热插拔是通过动态服务代理方法来实现的。但是对于一些在Activity启动的时候加载的东西，他们只加载一次，这种方式就不生效了。

原文中并没有直接地给出温插拔的实现，从作者的描述中看似乎这部分还没有完全实现，因此这里将原文的翻译贴出来，后续如果有更深入的文章，再回来补上。

> 目前，对*任何*资源的更改都会导致所有资源被重新打包并传输到您的应用程序，但我们正在开发一个增量打包程序，它只会打包和部署新的或修改过的资源。

> 请注意，热插拔不适用于更改清单中引用的资源，也不适用于更改清单本身，因为清单值是在安装APK时读取的。对清单（或清单引用的资源）的更改将触发一次完整的构建和部署。

> 遗憾的是，重新启动活动并不能神奇地应用结构更改。添加、移除或更改注释、字段、静态或实例方法签名，或更改父类或静态初始化器都需要进行冷插拔（Cold Swap）。

# 冷插拔（Cold Swap）

当Android Studio部署APP（到设备）的时候，APP里包含的所有的类会被划分到至多10个片段，每个片段包含自己的Dex文件，类会根据包名分配到片段中。在应用冷插拔的过程中，修改后的类会替换同一片段中修改前的类，然后Android Studio再把这个片段部署到目标设备上。

这种方法取决于ART是否能够加载多个dex文件，这是ART引入的一项功能，只有在 Android 5.0及更高版本的设备上才能保证实现。 对于低版本的目标设备（可能还在用Dalvik），Android Studio会部署完整的APK。

# 其他

到此，Instant Run的主要部分就讲完了。原文剩下的部分是一些使用注意事项，这里简单贴一些翻译：

- 代码可以通过热插拔应用，但是代码逻辑会影响到APP启动时的资源，这种情况下还是要通过重启APP来应用，否则修改无法完全生效
- 调整分配给Gradle进程的资源。 如果通过gradle.propertie文件中的jvmargs设置为 Gradle Daemon JVM 分配了至少2 GB的资源，dex-in-process就会启用，并显著提高所有构建（即时运行和完整/干净构建）的速度。您需要尝试并观察对构建时间的影响，以找到适合自己的值。
- 请记住，对清单的更改将触发一个完整的构建和部署周期，因此，如果您的构建流程会自动更新应用程序清单的任何部分（例如自动迭代版本代码或版本名称），您需要在调试构建变量中禁用该行为。
- 如果您使用的是 Windows 系统，Windows Defender实时保护可能会导致即时运行速度减慢。 您可以将项目文件夹添加到Windows Defender排除列表中来解决这个问题。

# *完*😊
