---
title: '安卓事件分发学习记录'
date: 2024-10-20T15:05:05+08:00
draft: false
tags: ['Android']
categories: ['技术']
image: ''
---
> 📖 事件分发这一块是老掉牙的八股文内容了，但因为平时没这方面的需求，因此一直研究的不深；这一次对着源码，把事件分发的大致流程梳理清楚

# 从Activity开始
```Activity```作为绝大多数应用的入口，其本身并不负责直接处理视图。我们看到的由```Activity```展示出来的内容，实际上是由```Activity```内部的```Window```提供的。```Activity```在创建的时候，会保存一个```Window```实例（默认是```PhoneWindow```），我们在```onCreate```中调用的```setContentView()```本质上是交给了这个```Window```实例来处理的：
```java
    /**
     * Set the activity content to an explicit view.  This view is placed
     * directly into the activity's view hierarchy.  It can itself be a complex
     * view hierarchy.  When calling this method, the layout parameters of the
     * specified view are ignored.  Both the width and the height of the view are
     * set by default to {@link ViewGroup.LayoutParams#MATCH_PARENT}. To use
     * your own layout parameters, invoke
     * {@link #setContentView(android.view.View, android.view.ViewGroup.LayoutParams)}
     * instead.
     *
     * @param view The desired content to display.
     *
     * @see #setContentView(int)
     * @see #setContentView(android.view.View, android.view.ViewGroup.LayoutParams)
     */
    public void setContentView(View view) {
        getWindow().setContentView(view);
        initWindowDecorActionBar();
    }
```
上面这段代码，打通了```Activity```和```Window```之间的桥梁（或者可以说打通了与视图之间的桥梁，因为```Window```本身也是一种```View``` ）。
`getWindow`这个方法返回的默认实现是 `PhoneWindow`，它对 `setContentView`的实现简单概括就是在 `DecorView`中将输入的 `View` 添加进去。

# 事件的分发的开始
原始的触摸事件是由底层硬件上报上来的，由父 `View`向子 `View`分发。这句话是八股文里面最常见的说法。具体到实现，我们可以在项目的某一个 `Activity`的 `dispatchTouchEvent`中打印一下调用堆栈：
```
java.lang.Exception: LLF
    at lying.fengfeng.emptyproject.MainActivity.dispatchTouchEvent(MainActivity.kt:23)
    at androidx.appcompat.view.WindowCallbackWrapper.dispatchTouchEvent(WindowCallbackWrapper.java:69)
    at com.android.internal.policy.DecorView.dispatchTouchEvent(DecorView.java:458) // 3. 顶层View分发事件
    at android.view.View.dispatchPointerEvent(View.java:15262)
    at android.view.ViewRootImpl$ViewPostImeInputStage.processPointerEvent(ViewRootImpl.java:6654) // 2.调用View中的方法来进一步处理事件
    at android.view.ViewRootImpl$ViewPostImeInputStage.onProcess(ViewRootImpl.java:6454)
    at android.view.ViewRootImpl$InputStage.deliver(ViewRootImpl.java:5910)
    at android.view.ViewRootImpl$InputStage.onDeliverToNext(ViewRootImpl.java:5967)
    at android.view.ViewRootImpl$InputStage.forward(ViewRootImpl.java:5933)
    at android.view.ViewRootImpl$AsyncInputStage.forward(ViewRootImpl.java:6098)
    at android.view.ViewRootImpl$InputStage.apply(ViewRootImpl.java:5941)
    at android.view.ViewRootImpl$AsyncInputStage.apply(ViewRootImpl.java:6155)
    at android.view.ViewRootImpl$InputStage.deliver(ViewRootImpl.java:5914)
    at android.view.ViewRootImpl$InputStage.onDeliverToNext(ViewRootImpl.java:5967)
    at android.view.ViewRootImpl$InputStage.forward(ViewRootImpl.java:5933)
    at android.view.ViewRootImpl$InputStage.apply(ViewRootImpl.java:5941)
    at android.view.ViewRootImpl$InputStage.deliver(ViewRootImpl.java:5914)
    at android.view.ViewRootImpl.deliverInputEvent(ViewRootImpl.java:8996)
    at android.view.ViewRootImpl.doProcessInputEvents(ViewRootImpl.java:8947)
    at android.view.ViewRootImpl.enqueueInputEvent(ViewRootImpl.java:8916)
    at android.view.ViewRootImpl$WindowInputEventReceiver.onInputEvent(ViewRootImpl.java:9119) // 1.ViewRootImpl中InputEventReceiver的实现接收输入事件
    at android.view.InputEventReceiver.dispatchInputEvent(InputEventReceiver.java:267)
    at android.os.MessageQueue.nativePollOnce(Native Method)
    at android.os.MessageQueue.next(MessageQueue.java:335)
    at android.os.Looper.loopOnce(Looper.java:161)
    at android.os.Looper.loop(Looper.java:288)
    at android.app.ActivityThread.main(ActivityThread.java:7872)
    at java.lang.reflect.Method.invoke(Native Method)
    at com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:548)
    at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:936)

```

上述堆栈中有三个关键节点（对应三处日志）：
1. `ViewRootImpl` 中的实例 `WindowInputEventReceiver` 接收来自底层的输入事件，并且交给一个队列结构来等待时间的消费
2. `ViewRootImpl` 中的实例 `ViewPostImeInputStage` 调用 `View`中的方法来进一步处理事件，这里开始对事件的处理开始进入了 `View` 的结构；`ViewRootImpl` 中保存了一个 `View` 实例，虽然我没有通过源码确认他是否就是 `DecorView` ，但是从堆栈来判断是的
3. `DecorView` 开始分发事件，调用 `Activity` 中的 `dispatchTouchEvent` 方法。这段源码很简单，可以对着源码看：
```java
// DecorView.java

@Override
public boolean dispatchTouchEvent(MotionEvent ev) {
	final Window.Callback cb = mWindow.getCallback(); // 这里得到的其实就是Activity，Activity这个类本身实现了Window.Callback这个接口
	return cb != null && !mWindow.isDestroyed() && mFeatureId < 0
			? cb.dispatchTouchEvent(ev) : super.dispatchTouchEvent(ev);
}
```
到这里，输入事件已经进入到 `Activity` 。如果我们没有在子类中完全拦截输入事件，而是调用了 `super.dispatchTouchEvent` 的话，在 `Activity` 中分发输入事件的代码如下所示：
```java
// Activity.java

public boolean dispatchTouchEvent(MotionEvent ev) {
    if (ev.getAction() == MotionEvent.ACTION_DOWN) {
        onUserInteraction();
    }
    if (getWindow().superDispatchTouchEvent(ev)) { // 这一行需要注意
        return true;
    }
    return onTouchEvent(ev);
}
```
在注释标记的那一行代码中，`Activity` 调用了 `PhoneWindow` 的 `superDispatchTouchEvent` 方法，而在 `PhoneWindow` 中，这个方法直接调用了 `DecorView` 中的同名方法；`DecorView` 对这个方法的实现正如这个函数的名字，调用了 `super.dispatchTouchEvent`。而 `DecorView` 本身是继承自 `ViewGroup` 的，所以这个方法才标志着八股文中提到的【由父View向子View分发】的正式开始。

# 事件分发的过程
`ViewGroup` 中对事件的分发过程简单概括两部分：1、 判断是否需要拦截事件 2、如果不需要拦截事件，则依次调用子 `View` 的 `dispatchTouchEvent` 方法。
拦截事件是 `ViewGroup` 特有的方法，子 `ViewGroup` 通过重写 `onInterceptTouchEvent` 并返回 `true` 即可在当前层级阻止事件继续向子层级传递。

# 事件处理的过程
事件处理的过程重点要搞清楚三个函数的作用以及他们返回值代表的含义：`dispatchTouchEvent`、`onInterceptTouchEvent`、`onTouchEvent`。
- `dispatchTouchEvent`：这个函数表示事件的分发，可以理解为事件从上向下传递的过程。这个函数返回 `true` 代表事件停止了分发，不再继续传递给子层级或者同一层级的前序 `View` 了； 而 `false` 则表示事件应当继续分发下去。事件停止分发不会调用处理函数，因此如果只想让事件不再继续传递，并不关心如何处理事件，可以通过这个函数来拦截事件。
- `onInterceptTouchEvent`： 这个函数表示在当前层级的 `ViewGroup` 中，拦截掉事件。这个函数返回 `true` 表明事件已经在当前层级被处理，不再向下传递。同时当前层级的 `onTouchEvnet` 会被调用来处理这个事件；返回 `false` 则表示当前层级不会拦截事件，事件优先交给子层级来处理，如果子层级无法处理，才交还给当前层级处理。这个函数的侧重点在**是否由当前层级处理事件**
- `onTouchEvent`： 这个函数中会做当前层级处理事件的具体操作。这个函数的返回值表示当前层级**是否已经处理完成了事件**，返回 `true` 表示事件已经被处理完成，父层级不会再继续处理事件了；反之则表示父层级需要继续处理事件。

# ✍️写困了，先睡觉了
如果耐心看到这里了，那我属实得说声谢谢☺️
