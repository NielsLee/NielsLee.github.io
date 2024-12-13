---
title: 'Android硬件加速学习记录'
date: 2024-12-13T15:59:43+08:00
draft: false
tags: ['Android']
categories: ['技术']
image: ''
---

# Android硬件加速学习记录

> 参考资料：
> [【掘金】“一文读懂”系列：Android中的硬件加速](https://juejin.cn/post/7166935241108488222)
> [渲染线程的创建和发展](https://androidperformance.com/2019/11/06/Android-Systrace-MainThread-And-RenderThread/#%E6%B8%B2%E6%9F%93%E7%BA%BF%E7%A8%8B%E7%9A%84%E5%88%9B%E5%BB%BA%E5%92%8C%E5%8F%91%E5%B1%95)

## 总览
**硬件加速**这个概念的底层原理是指：**通过将计算机CPU不擅长的图形计算通过特殊的api转换成GPU的指令，交给GPU完成，进而提高图形的性能表现**。我是这样理解“硬件”这个词的：对于一个计算机来说，它可以没有GPU，但是不能没有CPU。因此在这里GPU就成为了一个辅助CPU工作的硬件；如果没有这个硬件的话，CPU只能依靠软件的逻辑来完成图形绘制。

硬件加速在安卓系统上的实现，依赖于AOSP将OpenGL ES这样的图形库集成到了项目中，从而让安卓应用的绘制工作能够调用GPU来完成。AOSP中还有其他的图形API如Vulkan，根据我查到的资料显示，Vulkan相比于OpenGL ES来说要先进一些，支持多线程等特性。

## 硬件加速的入口
Android组件的绘制过程最终都是由`ViewRootImpl`中的`draw`方法来实现的，在这个方法中，存在一个if else判断：
```java
private void draw(boolean fullRedrawNeeded) {
    ...
    if (!dirty.isEmpty() || mIsAnimating || accessibilityFocusDirty) {
        if (mAttachInfo.mThreadedRenderer != null && mAttachInfo.mThreadedRenderer.isEnabled()) { //1 判断是否存在渲染线程以及渲染线程是否启用
            ...
            mAttachInfo.mThreadedRenderer.draw(mView, mAttachInfo, this);//2 如果满足条件，通过渲染线程进行绘制
    } else {
            if (!drawSoftware(surface, mAttachInfo, xOffset, yOffset, scalingRequired, dirty)) {//3 如果不满足条件则进行软件绘制
                    return;
            }
        }
    }

}
```
参考上述代码中的注释，`draw`方法中会进行一个条件判断，当渲染线程存在并且启用的时候，借助渲染线程进行绘制；否则执行软件绘制。而控制这个条件判断的代码比较复杂，这里就不贴源码了只做一个总结：一个Window是否开启硬件加速是通过`WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED`这个标志来判断的；这个标志可以通过方法手动设置，也可以在清单文件中对Activity进行设置（在Target API 14以后默认开启），开启后这个Activity创建的Window就会使用硬件加速来绘制UI。

## 硬件加速的过程
硬件加速分为两步：1. 构建阶段 2. 绘制阶段

### 构建阶段
View在生成实例的时候，会创建一个`RenderNode`，这个Node里面维护了一个Display List，用于存放绘制这个视图所需的所有的绘制操作；这样做的好处在于：1. 如果一个视图在下一帧没有变化，那么这个视图在下一帧的绘制就可以直接复用上一帧的Display List不用做改动了；2. 如果一个视图只是发生了一些透明度或者位置的变化，那么下一帧绘制它的时候可以针对整个Display List做属性上的修改就可以了，不需要再一步步把它绘制出来；
> 个人理解：RenderNode就是一个视图的“生产流水线”，里面保存着生成这一个视图的所有原子绘制操作；

在绘制整个窗口的下一帧的时候，**CPU在主线程**递归遍历所有的RenderNode，然后调用`updateRootDisplayList`方法进入绘制流程；这个函数延伸的代码很多，其中最核心的点在于它里面调用了View的`draw`方法以及ViewGroup的`dispatchDraw`方法；也就是说，**CPU在主线程遍历Window下面所有视图的draw方法，将需要绘制的内容绘制到Display List**中。到这一步，构建过程就算完成了。

### 绘制阶段
构建阶段完成后，CPU会调用`nSyncAndDrawFrame`方法通知RenderThread线程进行绘制。RenderThread是一个native的线程，而且是一个单例的线程，它是由Java层的ThreadRenderer在构造函数中创建的；它创建的方法如下：
```cpp
RenderThread& RenderThread::getInstance() {
    [[clang::no_destroy]] static sp<RenderThread> sInstance = []() {
        sp<RenderThread> thread = sp<RenderThread>::make();
        thread->start("RenderThread");
        return thread;
    }();
    gHasRenderThreadInstance = true;
    return *sInstance;
}
```
这个线程被命名为RenderThread。按照参考文档里面的说法，这个线程也是一个消息机制模型（Looper），但是可能是由于AOSP的代码做了修改，我没有直接找到循环的逻辑。但是不妨碍我们理解它的工作机制。上面说的`nSyncAndDrawFrame`方法其实就是向RenderThread线程中添加了一个渲染任务，通知它更新视图。到这里，硬件加速的简易流程就梳理完了。

## 软件绘制
为了做一个对比，这里也记录一下当没有开启硬件加速（由CPU进行软件绘制）的视图绘制过程。

在前面使用硬件加速的时候，CPU没有直接操作图形API，而是将所有的子视图的draw逻辑打包到一个Display List中，然后交给渲染线程来完成绘制操作。当使用软件绘制的时候，CPU就需要亲自上阵了：**它首先会调用Surface类的`lockCanvas`方法获取到一个封装了图形api的Canvas实例，然后再遍历所有子视图的draw方法，并将这个直接操作图形api的Canvas实例交给draw方法**。也就是说，**draw方法中会直接操作图形api，而这个过程又是全程在主线程中完成的**。等到所有子视图绘制完成后，再通知SurfaceFlinger将绘制完成的视图显示到屏幕上。

## 总结
回过头来再看这个流程，就很清晰了：**硬件加速开启以后，CPU不需要在主线程完成从构建到绘制的全部操作了；CPU只需要在主线程将所有视图的绘制任务打包好，然后通知渲染线程来完成剩下的绘制操作**
