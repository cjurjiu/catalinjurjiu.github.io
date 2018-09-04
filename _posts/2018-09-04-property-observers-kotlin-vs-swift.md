---
title: "Property Observers: Kotlin vs Swift"
excerpt_separator: "<!--more-->"
categories:
  - Kotlin
tags:
  - Kotlin
---

Property observers are a cool language feature available to both [Swift](https://developer.apple.com/swift/) 
and [Kotlin](https://kotlinlang.org/) developers. 

It's interesting to see the different approaches the Swift & Kotlin teams respectively took to implementing them. 
Curious? Let's explore.

# In a nutshell

A property observer essentially is a listener which gets notified whenever a change occurs in the value 
of the property it tracks. 

In both Kotlin & Swift, property observers expose 2 methods: the first is called just before 
the new value is applied to the observed property (`willSet` - Swift, `beforeChange` - Kotlin), whereas the second is 
called right after the new value has been set (`didSet` - Swift, `afterChange` - Kotlin).

To give a glimpse on how they work, let's assume we have a pair of property observers defined for a field `mapPosition` 
in a `Player` class. These property observers will just print what changes occur in the value of `mapPosition`. 

In this scenario, if we were to execute the following code:
```swift
let player = Player()
player.mapPosition = (x:9, y:10)
```
The console would print:
```swift
Player will move to: (x: 9, y: 10) from (x: 0, y: 0)
Player moved to: (x: 9, y: 10) from (x: 0, y: 0)
```

While similar at the surface, there are important differences to note when looking at the way property observers are 
implemented & used in the two languages. 
  
# Similar, but not the same: Syntax vs Contracts 

Property observers in Swift are part of the syntax itself: 

```swift
//Player.swift
typealias Position2D = (x: Int, y: Int)
class Player {   
    var mapPosition: Position2D = (x: 0, y: 0) {
        willSet(newValue) {
            print("Player will move to: \(newValue) from \(mapPosition)")
        }
        didSet(oldValue) {
            print("Player moved to: \(mapPosition) from \(oldValue)")
        }
    }
}
```

Being part of the language itself, property observers in Swift benefit from a few rules which makes using them more 
convenient, when compared to their Kotlin equivalents. We'll come back to this later.

In contrast, Kotlin property observers are not part of the language syntax, but are available as
[delegated properties](https://kotlinlang.org/docs/reference/delegated-properties.html):

```kotlin
//Player.kt
data class Position2D(val x: Int, val y: Int)
class Player {
    var mapPosition: Position2D by object : ObservableProperty<Position2D>(initialValue = Position2D(x = 0, y = 0)) {
        override fun beforeChange(property: KProperty<*>, oldValue: Position2D, newValue: Position2D): Boolean {
            print("Player will move to: ${newValue} from ${oldValue}")
            return true
        }
        override fun afterChange(property: KProperty<*>, oldValue: Position2D, newValue: Position2D) {
            print("Player moved to: ${newValue} from ${oldValue}")
        }
    }
}
``` 

 `ObservableProperty<...>` is just an abstract class (included in Kotlin's stdlib) which adheres to the 
 `ReadWriteProperty<...>` **contract**:

```kotlin
//Base interface that can be used for implementing property delegates of 
//read-write properties.
public interface ReadWriteProperty<in R, T> {
    //Returns the value of the property for the given object.  
    fun getValue(thisRef: R, property: KProperty<*>): T
    //Sets the value of the property for the given object.
    fun setValue(thisRef: R, property: KProperty<*>, value: T)
}
```

The contract defined by `ReadWriteProperty<...>` needs to be respected for a class to be used as a delegated property 
(there's also a `ReadOnlyProperty<...>` for read-only properties). As long as this contract is respected, functionality 
can be added on top.
{: .notice--info }

Besides adhering to the aforementioned contract, `ObservableProperty` adds two hooks additional: `beforeChange` & `afterChange`. 
These hooks work similarly to their Swift `willSet`/`didSet` counterparts, in that they are notified before/after the 
value of the observed property changes. 

Digging deeper, if we look at the [code](https://github.com/JetBrains/kotlin/blob/master/libraries/stdlib/src/kotlin/properties/ObservableProperty.kt) 
of `ObservableProperty` we see that it's just a normal class which doesn't rely on any private API's.

> Then what's stopping me from implementing my own version of a property observer and use it instead of the built-in one?

That can be done! Furthermore, going beyond just property observers, implementing custom delegated properties is an 
extremely powerful language feature in Kotlin and only discussing it in the context of property observers wouldn't do it 
justice. (delegated properties require an article just for themselves, so we'll try to not zoom-in on them too much here) 

Before moving on, let's see how a reimplemented property observer would look in Kotlin. Let's assume we really don't like 
`ObservableProperty`'s API because we find it too verbose for our taste. Maybe we want to have observable properties which 
have an API similar to the ones from Swift. 

One possible implementation would look like this:

```kotlin
class SwiftObservableProperty<in R, T>(initialValue: T,
                                       private val willSet: (currentValue: T, newValue: T) -> Unit = { _: T, _: T -> /*nothing*/ },
                                       private val didSet: (oldValue: T, newValue: T) -> T = { _: T, newValue: T -> newValue })
    : ReadWriteProperty<R, T> {

    private var currentValue: T = initialValue

    override fun getValue(thisRef: R, property: KProperty<*>): T = currentValue
    override fun setValue(thisRef: R, property: KProperty<*>, value: T) {
        willSet(currentValue = currentValue, newValue = value)
        val oldValue: T = currentValue
        currentValue = value
        currentValue = didSet(oldValue = oldValue, newValue = value)
    }

    private fun willSet(currentValue: T, newValue: T) = willSet.invoke(currentValue, newValue)
    private fun didSet(oldValue: T, newValue: T) = didSet.invoke(oldValue, newValue)
}
```

Documentation shamelessly sacrificed for brevity.
{: .notice--warning}

At a first glance, this might look like an overly complicated a generics soup. There isn't much to explain here though,
since everything is rather straightforward. Just copy the code in an IDE and you'll see that there isn't much to it. 
{: .notice--info}

This `SwiftObservableProperty` could then be used as:
```kotlin
class Player {
    var mapPosition: Position2D by SwiftObservableProperty(initialValue = Position2D(x = 0, y = 0),
            willSet = { currentValue, newValue ->
                print("Player will move to: ${newValue} from ${currentValue}")
            },
            didSet = { oldValue, newValue ->
                print("Player moved to: ${newValue} from ${oldValue}")
                return@SwiftObservableProperty newValue
            })
}
```
{: #swift_observable_property_kotlin_return_reference}

Significantly shorter, isn't it? And very similar to the Swift version as well.

By this point, one of Kotlin's advantages should become apparent: by writing our own custom delegated properties, we can 
define arbitrary custom behavior for our Kotlin properties. In terms of property observers, we can define property observers 
that are triggered whenever the value of the property is *read*, not just when then value is changed. This might sound like
a weird use-case at first, but there are cases when *READ* operations need to be counted. 

Now, adding arbitrary logic or reimplementing property observers in Swift in a similar manner is not possible because
they are, again, defined via **syntax**, and not via a an abstraction (like the `ReadWriteProperty` contract). However,
as also mentioned earlier, Swift has other advantages when it comes to its property observers. 

In order to understand these advantages, first we need to look at how how Kotlin behaves if we try to assign an arbitrary 
to `mapPosition` inside `didSet`, instead of `newValue` (we'll use the `SwiftObservableProperty` that we defined earlier, 
just because it makes things short & clear):

```kotlin
 class Player {
     var mapPosition: Position2D by SwiftObservableProperty(initialValue = Position2D(x = 0, y = 0),
             //no willSet in this case, to keep things simple
             didSet = { oldValue, newValue ->
                 print("Player moved to: ${newValue} from ${oldValue}")
                 //set mapPosition to an arbitrary value
                 mapPosition = Position2D(x = 18, y = 24)
                 print("Player changed his mind, moved to: ${mapPosition}")
             })
 }
```
{: #kotlin_flawed_direct_asignment_ref  }


Running this yields:

```kotlin
val player = Player()
player.mapPosition = Position2D(x = 10, y = 5)

//console output
Player moved to: Position2D(x=10, y=5) from Position2D(x=0, y=0)
Player moved to: Position2D(x=18, y=24) from Position2D(x=10, y=5)
Player moved to: Position2D(x=18, y=24) from Position2D(x=18, y=24)
Player moved to: Position2D(x=18, y=24) from Position2D(x=18, y=24)
...
09-04 14:17:11.732 9611-9611/? E/AndroidRuntime: FATAL EXCEPTION: main
    Process: com.catalinjurjiu.propertyobserver, PID: 9611
    java.lang.StackOverflowError: stack size 8MB
    ...
```

It yields a `StackoverflowError`. This happens because assigning a value to `mapPosition` in either `didSet` or `willSet`
results in an endless recursion. In the example above, the assignment happens in `didSet`. When the assignment takes place
it invokes `mapPosition`'s setter. The setter will invoke `didSet`, which makes the assignment again, calling the setter 
once again. This happens on and on until the stack is full and the program crashes. Annoying. 

This is why we need to **return** the actual value we want set on the property within `didSet` when using 
[`SwiftPropertyObserver`](#swift_observable_property_kotlin_return_reference), in favour of the direct assignment in the
example [above](#kotlin_flawed_direct_asignment_ref).
{: .notice--warning }

Let's try the same in Swift. Code which assigns an arbitrary value to `mapPosition` in `didSet`:
 
```swift
//Player.swift
class Player {
    var mapPosition: Position2D = (x: 0, y: 0) {
        ...
        didSet(oldValue) {      
            //set mapPosition to an arbitrary value
            print("Player moved to: \(mapPosition) from \(oldValue)")            
            mapPosition = Position2D(x: 18, y: 24)
            print("Player changed his mind, moved to: ${mapPosition}") 
        }
    }
}
```

Execution & output:

```swift
let player = Player()
player.mapPosition = Position2D(x: 10, y: 5)

//console output
Player moved to: Position2D(x: 10, y: 5) from Position2D(x: 0, y: 0)
Player changed his mind, moved to: Position2D(x: 18, y: 24)
```

No error. How is this possible? 

Since Swift's property observers are baked into the language itself, they have some special rules made just for them. More
specifically, assigning a value to the observed property from the body of `didSet` or `willSet` will **not** trigger an 
infinite recursion in Swift. Under the hood Swift will assign the value directly to the backing field of the property,
whenever an assignment happens in either of the two observers. This is done specifically to avoid calling the setter of 
the property, and thus to avoid the recursion problem present in Kotlin. Neat.

This trick is enabled purely by the fact the property observers in Swift are baked into the language as a standalone feature. 
Since Kotlin's property observers are not a language feature themselves (delegated properties is the feature which enables them),
there are no rules just for them within the language. From the point of view of the Kotlin compiler, 
`ObservableProperty` is just another class which needs to respect the same rules as any other class.   

# `lazy`: similar story, different keywords

Another example of a language feature which is implemented as part of the syntax in Swift but made available via delegated 
properties in Kotlin is lazy instantiation.

In Swift there's direct support for lazy instantiation via the [`lazy`](https://docs.swift.org/swift-book/LanguageGuide/Properties.html#ID257) 
keyword, whereas in Kotlin the support exists via the [`lazy` delegated property](https://kotlinlang.org/api/latest/jvm/stdlib/kotlin/lazy.html).

The situation is similar to what we have for property observers: the Swift version is more convenient and makes the code 
slightly more readable, whereas the Kotlin version is more configurable, easier to extend and as a bonus has built-in 
support for the case when multiple threads trying to initialize the same lazy property. 

# Summary 

 We explored how both Swift & Kotlin made property observers available to their developers, and tackled some of the 
 differences in the 2 approaches.  
 
 The gist of it is that Swift's approach is more convenient to use and exposes the developer to fewer potential pitfalls
 (e.g. no risk of an endless recursion crashing your app) whereas the approach adopted by the team behind Kotlin is more
 customizable & open to extension.