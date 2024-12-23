---
title: 'OpenGL Leak学习记录'
date: 2024-12-19T15:42:46+08:00
draft: false
tags: ['Android']
categories: ['技术']
image: ''
---

# OpenGL Leak学习记录

## 介绍
OpenGL Leak是腾讯开源框架Matrix中的一个组件，官方并没有为这个组件提供介绍文档，也并没有给这个组件提供Demo。因此这篇文章中对这个组件的分析都是基于阅读源码+手动搭建Demo实现的。大体上讲，这个组件的作用是用来检测安卓系统中OpenGL存在的内存泄露行为；具体的细节上还存在诸多疑惑的点，后续文章中会提到。

## 代码架构

OpenGL Leak组件的核心技术是TLS Hook。组件将OpenGL ES的API进行了Hook，收集每个API的调用状态，然后生成事件供上层处理。整体的代码分为以下几个模块，我们逐一讲述。

### 入口

入口模块的主要工作是提供组件工作需要的Context，事件处理回调等参数，并且提供组件启动和结束的方法。这一部分需要关注的点是：组件本身提供了一个`OpenglIndexDetectorService`；入口完成初始化以后，就会启动这个Service并开始寻找OpenGL api在内存中的位置，为后续做hook做准备。不过为什么这个操作要通过IPC的方式在另外一个Service完成呢？截止目前我还没搞懂。

### API Hook

Hook部分算是这个组件中比较核心的部分。他的原理是：**由于OpenGL ES的实现是由不同的驱动厂商提供的，因此Android需要从厂商提供的so库中加载OpenGL ES api的函数地址并存放到特定的寄存器中。那么我们的程序便可以从这个寄存器中获取到api的函数地址，并替换成Hook以后的函数地址，即可以完成Hook操作**

这里有一篇文章可以当做参考：[Android Hook OpenGL ES (TLSHook)](https://robot9.me/android-tls-hook/)

配合源码理解一下：
```cpp
gl_hooks_t *get_gl_hooks() {
    // 获取 TLS，即从寄存器中获取指针数组
    volatile void *tls_base = __get_tls();

    // 强制类型转换，将Void*类型的指针转化为函数指针结构体
    gl_hooks_t *volatile *tls_hooks =
            reinterpret_cast<gl_hooks_t *volatile *>(tls_base);
    
    // 声明一个用来指向api函数的指针
    gl_hooks_t *hooks = NULL;

    // android >= 10 TLS 位置有变化
    char sdk[128] = "0";
    __system_property_get("ro.build.version.sdk", sdk);
    int sdk_version = atoi(sdk);

    // 为api函数指针赋值，指向api函数结构体的起始位置
    if (sdk_version >= 29) {
        // android 10
        hooks = tls_hooks[4];
    } else {
        hooks = tls_hooks[3];
    }

    return hooks;
}

```

上面这个函数，只是获取到了OpenGL ES api函数指针的起始位置，至于每个api函数的具体位置，可以按照AOSP中规定的来，也可以自行寻找。OpenGL Leak中采用的是自行寻找的方式，这里也结合源码看一下：

```cpp
extern "C" JNIEXPORT jint JNICALL
Java_com_tencent_matrix_openglleak_detector_FuncSeeker_getTargetFuncIndex(JNIEnv *env, jclass, jstring target_func_name) {
    // 首先，拿到OpenGL ES api对应的函数指针结构体
    gl_hooks_t *hooks = get_gl_hooks();
    if (NULL == hooks) {
        return 0;
    }

    // 获取到函数名对应的原函数的指针
    System_GlNormal_TYPE target_func = get_target_func_ptr(
            env->GetStringUTFChars(target_func_name, JNI_FALSE));
    if (NULL == target_func) {
        return 0;
    }

    for (i_glGenNormal = 0; i_glGenNormal < 500; i_glGenNormal++) {
        // has_hook_glGenNormal是一个标志位，_my_glNormal中会将这个标志位置为true；
        if (has_hook_glGenNormal) {
            // 由于_my_glNormal执行完后index会+1，所以这里判断标志位为true以后，要将index减去1得到的才是函数真正的位置
            i_glGenNormal = i_glGenNormal - 1;
            // 将原函数放回原来的位置
            void **method = (void **) (&hooks->gl.foo1 + i_glGenNormal);
            *method = (void *) _system_glGenNormal;
            break;
        }

        // 第一次遍历的时候，_system_glGenNormal为NULL，所以不用担心索引为-1
        if (_system_glGenNormal != NULL) {
            void **method = (void **) (&hooks->gl.foo1 + (i_glGenNormal - 1));
            *method = (void *) _system_glGenNormal;
        }

        // 这里比较关键：将原函数的位置替换成_my_glNormal，然后后续执行一下原函数，如果能顺利执行，也就意味着_my_glNormal被执行了一遍，那么has_hook_glGenNormal标志位就会被设置为true，就可以跳出循环并返回函数的位置了
        void **replaceMethod = (void **) (&hooks->gl.foo1 + i_glGenNormal);
        _system_glGenNormal = (System_GlNormal_TYPE) *replaceMethod;

        *replaceMethod = (void *) _my_glNormal;

        // 执行一下原函数，验证是否已经拿到偏移值
        HOOK_O_FUNC(target_func, 0, 0);
    }

    // 遍历到头都没有找到对应的函数，认为函数不存在
    if (i_glGenNormal == 500) {
        i_glGenNormal = 0;
    }

    // release
    _system_glGenNormal = NULL;
    has_hook_glGenNormal = false;
    int result = i_glGenNormal;
    i_glGenNormal = 0;

    return result;
}
```
总结一下这个查找函数位置的逻辑就是：**根据要查找的目标函数名称，找到目标函数在内存中的位置；然后将目标函数的位置替换成自定义的函数，并执行一下目标函数；如果执行成功，也就意味着自定义函数执行成功，就可以返回目标函数的位置了；如果没有找到目标函数，则说明内存中没有目标函数**

如此一来，就不用依赖AOSP中定义的函数位置了，组件可以在初始化的时候自行寻找每个函数的位置，为后续的Hook做准备。有了函数在结构体中的Index以后，Hook函数就变得比较简单了，直接将结构体的地址加上Index的地址替换成Hook以后的函数即可：
```cpp
extern "C" JNIEXPORT jboolean JNICALL
Java_com_tencent_matrix_openglleak_hook_OpenGLHook_hookGlGenRenderbuffers
        (JNIEnv *, jclass, jint index) {
    gl_hooks_t *hooks = get_gl_hooks();
    if (NULL == hooks) {
        return false;
    }

    void **origFunPtr = NULL;

    origFunPtr = (void **) (&hooks->gl.foo1 + index);
    system_glGenRenderbuffers = (System_GlNormal_TYPE) *origFunPtr;
    *origFunPtr = (void *) my_glGenRenderbuffers;

    return true;
}
```

这一步结束，Hook操作就算完成了。自此每一个在Java层指定的OpenGL ES api函数都被替换成了Hook以后的函数。

### Hook函数逻辑

成功Hook api以后，接下来就要关注Hook以后的函数做了哪些自定义的操作。所有Hook函数的逻辑基本相似，拿一个来举例：
```cpp
GL_APICALL void GL_APIENTRY my_glGenTextures(GLsizei n, GLuint *textures) {
    if (NULL != system_glGenTextures) {
        // 首先执行原函数
        system_glGenTextures(n, textures);

        // 判断是否在RenderThread中，如果是的话则不做后续的逻辑了（等于没Hook）
        if (is_render_thread()) {
            return;
        }

        // 后续操作：将函数生成的纹理，native堆栈，tid，context等等的很多统计数据，然后将这些统计数据回调到Java层对应的Callback中
        GLuint *copy_textures = new GLuint[n];
        memcpy(copy_textures, textures, n * sizeof(GLuint));

        wechat_backtrace::Backtrace *backtracePrt = get_native_backtrace();

        int throwable = get_java_throwable();

        pid_t tid = pthread_gettid_np(pthread_self());

        EGLContext egl_context = eglGetCurrentContext();

        EGLSurface egl_draw_surface = eglGetCurrentSurface(EGL_DRAW);
        EGLSurface egl_read_surface = eglGetCurrentSurface(EGL_READ);

        char *activity_info = static_cast<char *>(malloc(BUF_SIZE));
        if (curr_activity_info != nullptr) {
            strcpy(activity_info, curr_activity_info);
        } else {
            strcpy(activity_info, "null");
        }

        messages_containers->
                enqueue_message((uintptr_t) egl_context,
                                [n, copy_textures, throwable, tid, backtracePrt, egl_context, egl_read_surface, egl_draw_surface, activity_info]() {

                                    gen_jni_callback(n, copy_textures, throwable, tid,
                                                     backtracePrt, egl_context, egl_draw_surface,
                                                     egl_read_surface,
                                                     activity_info, method_onGlGenTextures);

                                });
    }
}
```
Hook函数的逻辑就两个：
1. 先执行一遍原函数，确保功能正常
2. 再判断是否是在渲染线程，如果不在，就收集统计数据并回调给Java层处理

这里令我十分不理解的是为什么要跳过渲染线程中的操作。我尝试了一下在默认的开启硬件加速的情况下，原生组件、MediaPlayer和ExoPlayer视频播放都是在渲染线程中进行的。只有Webview会在Chromium的线程中渲染。

### Leak判断
针对Leak的判断，组件的逻辑是这样的：对于每一种资源（Texture、Buffer、Context等），在申请资源的时候将它放到一个表中。后续释放资源的时候从表中取出资源。然后当一个Activity被销毁的时候，判断表中是否还存在没有被取出的资源，如果有，则判断可能发生了Leak；等待五秒后二次判断，如果资源还存在，则确定发生了Leak。这块的逻辑不复杂，和Leak Canary有点相似。

## 待搞懂的问题
整理一下截止目前没有搞懂的问题：
1. 为什么查找函数要放到单独的Service中进行？
2. 为什么Hook函数要过滤掉在渲染线程中执行的情况？（在Matrix的Github Issue里面，有人提出了这两个一模一样的问题，可惜没有人回答；也许将来可以在企微上咨询一下原作者）
3. 我搜索了一些关于OpenGL内存泄露的问题，发现有人提到OpenGL的API本身并不约束内存操作。比如当我先调用glGenTextures再调用glDeleteTextures并不意味着我先申请了一块内存再释放了一块内存。因为OpenGL的API都是由厂商的驱动实现的，所以他们具体如何管理内存我们是不知道的。这也就意味着，监听资源的申请和回收并不能代表实际内存的变化。所以这个组件的原理和实际表现，还有待进一步考证。 
