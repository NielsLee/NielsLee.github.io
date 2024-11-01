---
title: 'LeetCode49记录'
date: 2024-11-01T13:07:55+08:00
draft: false
tags: ['技术']
categories: ['技术']
image: ''
---
> 今天刷到一道LeetCode，在这里记录一下思路和学习过程

# 49. 字母异位词分组

给你一个字符串数组，请你将**字母异位词**组合在一起。可以按任意顺序返回结果列表。

**字母异位词**是由重新排列源单词的所有字母得到的一个新单词。

**示例 1**:

> 输入: strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
> 输出: [["bat"],["nat","tan"],["ate","eat","tea"]]

**示例 2**:

> 输入: strs = [""]
> 输出: [[""]]

**示例 3**:

> 输入: strs = ["a"]
> 输出: [["a"]]

**提示**：

> 1 <= strs.length <= 104
> 0 <= strs[i].length <= 100
> strs[i] 仅包含小写字母

# 我的代码

```java
// 整体思路：要归类到一起的字符串只是位置发生了变化，那排序一下不就一样了么；所以把每个字符串排序一下，然后把结果一样的放到一起就完事了（暴力

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        // 用来存储【排序后的字符列表】到【结果列表的index】的映射
        Map<List<Character>, Integer> map = new HashMap();
        // 结果列表，用来存储结果
        List<List<String>> res = new LinkedList();
        // 结果列表的index，从0开始
        int index = 0;

        // 对输入的字符串数组进行遍历
        for (int i = 0; i < strs.length; i++) {
            // 得到每一个字符串
            String str = strs[i];
            // 创建一个列表，用来将字符串拆解成字符，然后按照原来的顺序放到这个列表中
            List<Character> clist = new LinkedList();
            for (int j = 0; j < str.length(); j++) {
                char c = str.charAt(j);
                clist.add(c);
            }
            // 对这个字符串列表进行排序
            Collections.sort(clist);
            // 查找map中是否存在排序后的列表的Key，如果有，将正在处理的字符串插入到结果列表中映射对应的index中；如果没有，那么在结果列表中插入一个新的列表，并且在map中创建排序列表的key和它对应的在结果列表中的位置的value
            if (map.containsKey(clist)) {
                res.get(map.get(clist)).add(str);
            } else {
                map.put(clist, index);
                List<String> newList = new LinkedList();
                newList.add(str);
                res.add(newList);
                index++;
            }
        }
        return res;
    }
}

```

这个解答属于很普通的暴力解法。在写这个解法的时候，我意识到可能存在一个问题：**在Map中存储列表到int的映射，那么存在于Map中的是这个列表的引用，还是这个列表的值？**

- 如果是引用的话，那么似乎没有办法通过Map的方式获取正确的映射，因为两个内容一样的列表可能属于不同的引用，导致获取不到同样的映射；
- 如果是值的话，那么这个值是如何由列表得到的？

首先，上述这段代码是通过了的（虽然用时和内存都很高）。这说明对于【两个内容一致的列表】来说，HashMap可以正确地认识到他们属于同一个Key；然后，我在Java的`containsKey()`方法中找到了这样一段注释：

> Returns true if this map contains a mapping for the specified key. More formally, returns true if and only if this map contains a mapping for a key k such that Objects. equals(key, k). (There can be at most one such mapping.)

好吧，原来人家在函数文档里面就已经写明白了，匹配key的方式是通过`Objects. equals(key, k)`。而这个方法最终比较的是两个入参的HashCode。对于集合List来说，计算HashCode的方式在`AbstractList`中被重写了，重写的逻辑保证对于相同集合内容的List来说，他们返回的HashCode是相同的。因此我们在`HashMap`中，可以使用相同元素但是不同实例的key来找到正确的value🙂
