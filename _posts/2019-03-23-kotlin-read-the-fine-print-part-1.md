---
title: "Kotlin: Read the fine print. Part 1 - `let?:run`"
excerpt_separator: "<!--more-->"
categories:
  - Kotlin
tags:
  - Kotlin
---

I've seen quite a lot of Kotlin features being misused in the last few months, across different teams. 

Perhaps unexpectedly, the majority of the cases seemed to be caused by <!--more--> developers which had limited Kotlin experience. What I found interesting however was the *nature* of the mistakes: Java concepts incorrectly mapped to Kotlin constructs. 

The problems caused by these vary from being just harmless breaches of Kotlin coding guidelines, to behavioral, bug-causing mistakes.

This is a multi-part series, in which I'll explore some of the ones I most commonly encountered.

# `let?:run` **vs** `if/else`

## `let`: short intro

You can skip this section if you're familiar with how `let` works, and with its `nullableVar?.let {}` usage.
{: .notice--info }

`let { }` is a hugely practical extension function in Kotlin, which is most commonly used when we only want a block of code to be executed if and only if a nullable `var` is not `null`. While, this is not the only (or primary) purpose of `let` (see in [scoping functions](https://kotlinlang.org/docs/reference/scope-functions.html#let)), it's the way how it's most commonly used.

So basically, given this:
{% highlight kotlin linenos %}
var x: Any?
//other code, assigments & processing involving "x"
...
x?.let { capturedX ->
    System.out.println("x is 100% not null! x is: ${capturedX.hashCode()}")
}
{% endhighlight %}
The print statement will only execute if `x` is not `null` by the time the `let` statement in `line 4` is executed.

Given the conditional nature of the `let` function, it's common for it to be compared with "equivalent" `if` blocks:
{% highlight kotlin linenos %}
var x: Any?
//other code, assigments & processing involving "x"
...
if (x != null) {
    System.out.println("x is 100% not null! x is: ${x.hashCode()}")
}
{% endhighlight %}

However, when using the `if` statement, the Kotlin compiler will issue the following error: 
``` kotlin
Error: Kotlin: Smart cast to 'Any' is impossible, because 'x' is a mutable property that could have been changed by this time.
```
Basically the compiler is complaining (and rightfully so) that the value of `x` can change between the null&nbsp;check at `line 4` and the statement where `x` is used at `line 5`. Important to say, the error would not appear if if `x` would be declared as a `val`, instead of being a mutable `var`.

However, this problem doesn't exist when using `let` because `let` captures the value of `x` when `let` is invoked. Meaning, even if `x` is declared as a `var` and its value changes immediately to a `null` after the `let` statement has been executed, the captured value will still point to the previous valid, non-null value.

## The problem

Because `let` is more convenient over the typical `if` clause when we want to execute a block of code only if a nullable `var` is not `null`, and because it's syntax is rather appealing (subjective? ¯\\\_(ツ)_/¯ ), it's not uncommon to see it even when not strictly necessary. 

For instance, in this case there's no specific *need* for `let`:

```kotlin
fun someMethod(x: Any?){
    x?.let {
        //do things
        //only if x
        //is not null
    }
}
```
`x` is essentially a `val` here, and since its value cannot change to a `null` after its null&nbsp;check, using an `if` would've been perfectly fine. However, in this specific case, using `let` over the `if` is harmless. From a functional perspective, the end result is the same.

*However*, from the perspective of using Kotlin's language features correctly, it's **wrong**. It's wrong because a [*scope function*](https://kotlinlang.org/docs/reference/scope-functions.html) (`let`) is used as a *conditional operator* (of sorts) in favour of built-in language constructs, part of Kotlin's syntax (the `if` statement). But again, the code is functionally equivalent in both cases, so using `let` on nullable `val`s doesn't cause actual bugs.

The real problem arises when `let` becomes *just* a *<u>null&nbsp;check</u>* in people's minds. And although `let` only deals with the non-`null` case, a proper *null&nbsp;check* usually needs to deal with both cases: the non-`null` case *and* the `null` case. 

If used often enough as just a null&nbsp;check, at some point the `let` operator will be used in a situation where handling the `null` case is also necessary. The "innovation" typically used to handle the `null` case when using `let` is a combination of the `let`, `run`, and the Elvis (`?:`) operator.

Please treat the following method of using `let` together with `run` as an **anti-pattern**, capable of causing serious bugs🔥 in your code.
{: .notice--danger }

The "innovation":

```kotlin
fun someMethod(x: Any?){
    x?.let {
        //do things
        //only if x
        //is NOT null
    } ?: run {
        //do things
        //only if x
        //is null
    }
}
```

The (flawed) assumption here is that the `let { } ?: run { }` structure represents a more potent Kotlin alternative to the traditional null&nbsp;check using the `if {} else {}` clause, because technically it behaves the same, *and* it works for both `var` & `val` values. This is **wrong**.

The way the `nullable?.let { } ?: run { }` construct is expected to work when used instead of an `if {} else {}` is in the following way:
  * if the nullable is **not** `null`, then the code inside `let` executes, the code in `run` does not;
  * if the nullable is `null`, then the `nullable?.let {...}` expression evaluates to `null`, which will cause the elvis operator to execute the `run{ }` block.

However, this line of judgement ignores a key fact about `let`: **it returns a value**.

<div style="width:80%;height:0;padding-bottom:46%;position:relative;margin:auto;">
    <iframe src="https://giphy.com/embed/3dcImYGte7itiKoTfw" width="100%" height="100%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe>
</div>
<p style="width:80%;position:relative;margin:auto;">
    <a href="https://giphy.com/gifs/oceans-8-trailer-3dcImYGte7itiKoTfw">via GIPHY</a>
</p>

This means that in certain cases **both** the `let` and the `run` block will execute! This almost always results in subtle (or, if you're lucky - very obvious) bugs.

For instance, let's take this seemingly benign example:

```kotlin
val data: Data? = Data()
var listener: SomeDataListener? = null
data?.let {
    System.out.println("data is NOT NULL")
    listener?.onNewData(it)     
} ?: run {
    System.out.println("data is NULL")
}
```
Will (perhaps unexpectedly) print:
```kotlin
data is NOT NULL
data is NULL
```

Since `let` returns a value, in the code sample above it returns the value resulting from the last line of its code block (implicit return in Kotlin 🙂. `line 5` translates to `return@let listener?.onNewData(data)`). Since `listener` is `null`, the `listener?.onNewData(data)` expression evaluates to...`null`. 

Since a `null` is returned from the `let` block, the whole `let ?: run` structure above basically reduces to:
```kotlin
null ?: run {
    System.out.println("data is NULL")
}
```

So the `let` block doesn't evaluate itself to `null` (because `data` is not `null`) but *it returns* a `null`. This `null` is then passed to the elvis operator (`?:`). Since the elvis operator sees a `null` on its left operand, it then (also) executes the `run {}` block 🙂. 

And that's how both the `let` & `run` blocks (i.e. both sides of the "binary" conditional operator) get executed, and how bugs are spawned 😀.

If the traditional `if/else` clause were to be used instead, the code would behave as expected (only 1 branch executes): 
```kotlin
val data: Data? = Data()
var listener: SomeDataListener? = null
if(data != null) {
    System.out.println("data is NOT NULL")
    listener?.onNewData(data)     
} else {
    System.out.println("data is NULL")
}
```
Correctly prints just `data is NOT NULL`.

Think just what kind of bugs would appear if *sometimes* in your (binary) conditional statements both of the branches would execute. 

However, it's *easy* to understand how it got here. First, `let` started to be used as a pseudo null&nbsp;check, then it gained responsibilities for which it wasn't designed for. Even today, there are plenty of Kotlin articles in the wild which actually recommend using `let { } ?: run { }`, as an alternative to `if/else`. 

However, `let { } ?: run { }` should be regarded as being an **anti-pattern**. In our team, we do not allow it to be used in our code. When we don't use `let` as a scope function, we only use it on nullable `var`s as a sort of convenience operator, *if* we do not also require to handle the case when the object is null. 

On nullable `val` objects we use the good'ol `if/else`.

# Up next

In the next article in this series we'll explore the cases when `lateinit` *should* be used vs the cases when it actually *seems* to be used. 