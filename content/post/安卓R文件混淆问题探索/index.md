---
title: '安卓R文件混淆问题探索'
date: 2024-09-26T12:37:07+08:00
draft: false
tags: ['Android']
categories: ['技术']
image: ''
---

> 首先感谢掘金的这篇文章，从中学到了很多关于R文件的知识和调试方法
> https://juejin.cn/post/7289748806438420480

## 背景
近期提供了一个Apk给业务应用接入，业务应用表示接入SDK以后包体积膨胀过大（208KB），需要优化，最好是能优化到100KB以下。由于我是第一次碰到这样的问题，所以只能一边查资料一边摸索

## 体积膨胀的原因
最初，我以为是我的SDK中的依赖项比较多，导致APK接入以后引入了过多的依赖，进而导致体积增长。但是和业务的APK开发沟通以后，发现SDK和APK中的依赖基本是重复的，只有很少的新增。而这些新增很难达到200KB的体积。这一个方向走不通。

随后，我通过ApkTool反编译了业务的APK，这一下发现了异常：业务的Apk反编译以后得到了很多smali_classes目录，进入到这些dex目录中，我发现每一个包名的路径下都会有很多R$*.smali文件；每个路径下这些文件的体积加在一起都有几百KB之多。随后我自己打包了一些Demo Apk然后使用同样的操作反编译，并没有发现产物中有这些R文件，所以初步认为这些被打包进Apk中的R文件就是导致体积增长的直接原因。
```
-a---           2024/9/19    16:53           2714 R$anim.smali
-a---           2024/9/19    16:53           2291 R$animator.smali
-a---           2024/9/19    16:53          62649 R$attr.smali
-a---           2024/9/19    16:53            496 R$bool.smali
-a---           2024/9/19    16:53          93277 R$color.smali
-a---           2024/9/19    16:53          47894 R$dimen.smali
-a---           2024/9/19    16:53          11621 R$drawable.smali
-a---           2024/9/19    16:53          25507 R$id.smali
-a---           2024/9/19    16:53           2424 R$integer.smali
-a---           2024/9/19    16:53           1172 R$interpolator.smali
-a---           2024/9/19    16:53           9441 R$layout.smali
-a---           2024/9/19    16:53            348 R$plurals.smali
-a---           2024/9/19    16:53           8853 R$string.smali
-a---           2024/9/19    16:53          67585 R$style.smali
-a---           2024/9/19    16:53         118393 R$styleable.smali
-a---           2024/9/19    16:53            643 R$xml.smali
```

## 根因
查询资料我了解到：
1. R文件是一个类，类中存储的是变量到资源ID的映射；平时开发Android的时候我们调用`R.id.XXX`，其实是调用的R这个类中的id这个类中的XXX变量（或常量，后续会有详细说明），这个变量帮助我们在APK中索引我们需要的资源；
2. 在library（aar）或者application（apk）中，R文件的表现是不一样的。我们先理解这么一个结论：**对于安卓工程来说，APK才是最终的产物，aar只是一种中间产物。所以aar中的资源最终都是要被打包到APK中的，APK中的资源才是生效的资源**。
3. aapt在处理资源文件的时候，会将所有aar中的资源文件和apk本身的资源文件合并到一个R文件中，然后再将这个R文件中的所有变量设置为常量。然后，代码编译的过程中，**引用到R文件的地方直接内联为常量值**

按照以上这些说法，在APK反编译以后，应该是不会看到如此多的R文件反编译得到的字节码的，**至少不应该每个包名下都有存在R文件字节码，因为R文件在打包的时候就已经合并成了一份了**。所以业务的Apk在打包的过程中，并没有将所有aar的R文件合并。顺着这个思路，我要到了业务的混淆配置文件，果然在其中发现了这样一段配置：
```
-keep public class **.R$* {
    public static final int *;
}
```
这段配置导致APK工程中所有包的R文件都不会被混淆或者压缩，我猜测这就是导致R文件的字节码被打包进APK的根因。随后我在Demo工程中也添加了这一段混淆配置进行验证，果然如此。

## 验证
随后我进行了一系列验证，来搞明白我在研究这个问题的过程中产生的一系列疑问：
### 1. 这一段配置的作用是什么？
考虑到混淆一个类通常是因为要使用反射调用，因此我让业务的开发帮忙去掉这段配置打了一个包，果不其然，在一些场景下APK无法正常运行了，其中有一个反射报错堆栈中有一行是这样的：
```
com.xxx.xxx.module.common.webview.BaseJsBridgeFragment$a.invoke(BaseJsBridgeFragment.kt:95)
```
于是对业务Apk反编译，找到对应的包名下的这个方法，找到了这样一段字节码：
```
Method declaredMethod = ((Class) type2).getDeclaredMethod("inflate", LayoutInflater.class);

...

Object invoke = declaredMethod.invoke(null, aVar2);
```
看起来，这段代码尝试反射调用一个类中涉及到布局的方法(inflate)，那么我们可以猜测是由于R文件被混淆，导致布局操作无法获取到资源文件，于是抛出了异常。

### 2. 这一段配置是如何影响APK产物的
我的Demo Apk中有这样一段代码（一段很普通的在onCreate创建视图的代码）：
```kotlin
@Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.container_web_activity);
```
然后分别打包两个Demo Apk，一个开启混淆并且配置keep R规则，另一个开启混淆但是不配置keep R规则，然后分别查看这段代码对应的字节码是怎样的。首先是没有keep R的Apk：
```
...

.method public onCreate(Landroid/os/Bundle;)V
    .registers 8

    invoke-super {p0, p1}, Landroidx/fragment/app/o;->onCreate(Landroid/os/Bundle;)V

    const v0, 0x7f0b0020

    invoke-virtual {p0, v0}, Le/h;->setContentView(I)V

...

```
可以看到，在调用setContentView这个方法之前，v0就已经被设置为常量0x7f0b0020了
接下来看配置了keep R的Apk：
```
...

.method public final onCreate(Landroid/os/Bundle;)V
    .registers 5
    .param p1    # Landroid/os/Bundle;
        .annotation build Landroidx/annotation/Nullable;
        .end annotation
    .end param

    .line 1
    invoke-virtual {p0}, Ljava/lang/Object;->getClass()Ljava/lang/Class;

    .line 2
    .line 3
    .line 4
    move-result-object v0

    .line 5
    invoke-virtual {v0}, Ljava/lang/Class;->getName()Ljava/lang/String;

    .line 6
    .line 7
    .line 8
    move-result-object v0

    .line 9
    invoke-static {v0}, Lcom/networkbench/agent/impl/instrumentation/NBSTraceEngine;->startTracing(Ljava/lang/String;)V

    .line 10
    .line 11
    .line 12
    invoke-super {p0, p1}, Landroidx/fragment/app/FragmentActivity;->onCreate(Landroid/os/Bundle;)V

    .line 13
    .line 14
    .line 15
    sget v0, Lcom/hihonor/hm/h5/container/R$layout;->container_web_activity:I

    .line 16
    .line 17
    invoke-virtual {p0, v0}, Landroidx/appcompat/app/AppCompatActivity;->setContentView(I)V

...
```
重点关注最后两行：倒数第二行的作用，是从**Lcom/hihonor/hm/h5/container/R$layout**这个类中获取到**container_web_activity**的值，也就是资源的ID，然后放入寄存器v0中；然后最后一行，才是将v0中的值作为setContentView方法的入参并调用这个方法。

**比较配置keep R前后的字节码，可以发现8对R文件的默认处理方式，就是我们上文提到的，将资源ID内联到字节码中；但是当我们配置了keep R的规则以后，R文件中的ID就不会进行内联操作了，代码执行到需要获取资源ID的时候，虚拟机还是需要从指定的类文件中获取资源ID**

## 结尾😊
第一次深入到字节码领域，曾经高深莫测的知识现在正在一点一点地揭开它的面纱，这感觉不错

另外，至于为什么我会自己花时间来研究这个混淆规则，而不是直接问业务的开发。是因为这段代码是21年从LDJ带来的，后来的人没有人知道这段代码当初为什么写了。在我看来这段规则的最佳实践应该是：aar中如果需要做反射操作，则aar的开发应该自行keep关键的类，而不是在最终的APK中把所有的资源都keep。但是现在代码既然已经这么写了，估计很难再有人推动去做改动了。

无所谓了，草台班子而已，演戏比做事重要。台下的人看的满意了就行，幕后再怎么破败，又有什么影响呢
