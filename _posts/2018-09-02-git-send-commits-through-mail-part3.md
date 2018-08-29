---
title: "Git: Send commits through mail - Part 3"
excerpt_separator: "<!--more-->"
categories:
  - Git
tags:
  - Git
---

Bob discovers the holy grail of sending commits via email.

This is the last article of a 3-part series. Make sure to also read [Part 1](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part1) 
& [Part 2](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part2).

## Recap

So far, Bob found 2 methods (somewhat similar) for sending his commits from his fast machine used for development 
(Roadrunner) to his slow machine with internal network access (Sloth). 

In the end however, both of these methods resulted in commits with changed SHA1 id's after being moved from one machine 
to another. Additionally, neither of these two methods offer any sort of restrictions when it comes to re-applying the 
commits - this opens the door to potentially undesired changes being committed by mistake.

## Digging deeper

### SHA1: Guarantee of contents 

In a scenario where there's a lot of back & forth in terms of moving commits between the 2 machines, and where with each 
move some changes are added to the code, having identical commit SHA1 ids on both machines means you can trust that 
the two repositories are truly equivalent.

The SHA1 of a commit is basically the unique identifier of the commit object & **of the changes introduced by the commit**. 
A changed SHA1 after moving a commit from one machine to another gives no guarantee that the content is exactly the same 
on the second machine. And we need such guarantees to not have to manually verify the contents of each moved commit, after
it has been applied.

The inconveniences caused by changing SHA1 id's are somewhat limited, and can be mitigated by paying attention on what
commits actually need to be moved, what operations to apply, etc. But having to pay attention is not really the point, 
is it? It isn't, at least not when we don't have to.

### Apply restrictions: guarantee of history

Commits saved using `git diff` or `git format-patch` can be applied on top of any other commit - the parent doesn't need
to stay the same. Sometimes this is exactly what's needed, but not always.

Consider the following case: On Roadrunner, `CoolFeature.java`:

```java                                                
Bob is a truly great developer.                 | dc557cd commit#1
If copying StackOverflow answers counts         | f44f51a commit#2
He usually writes his own code.                 | 94e007a commit#3
It gets the job done though.                    | 34c82af commit#4 (HEAD -> master) 
```

Now, Bob needs to send `commit#4` over to Sloth. So he creates a patch with `git format-patch`, and sends it over to Sloth. 
However, before applying the patch he finds out that a colleague of his pushed something to the remote. So before he 
applies the patch, he performs a pull on Sloth, and updates the master.

After the pull, Bob sees that the new commit created by his colleague also contains a completely new file, 
`SomeOtherFeature.java`:
```java
Some other feature, by Martin.                     | a9c2b79 someOtherFeature#1 (HEAD -> master)
```

`CoolFeature.java` has been untouched:
```java                                                
Bob is a truly great developer.                 | dc557cd commit#1
If copying StackOverflow answers counts         | f44f51a commit#2
He usually writes his own code.                 | 94e007a commit#3 
```

Can he apply the patch created on Roadrunner, in this case? If he could apply it, it would be applied on top of
commit `a9c2b79 someOtherFeature#1`, and not on top of `94e007a commit#3`. 

Turns out, this works just fine, because no information about the parent commit is stored in the patch file. As long as
the `diff` of the patch can be applied on top of the current files, it will be applied, regardless whether the history
looks the same or not. This would've worked even if the changes would've occurred in the same file - maybe in that case
`git am` would've needed to perform a 3-way merge (need to specify `-3` as parameter), but most likely git wouldn't have
prevented the patch from being applied on the basis that the commit parent on the new machine is different form the commit 
parent on the initial machine.

This opens the room for human nature errors to appear: applying a patch on top of a different parent (without realizing it), 
then pushing the code. This opens the door for certain bugs to be introduced, if the situation is not observed, and the 
code is not tested once more, after applying the patch on top of the new parent. 

## Solution: `git bundle`

`git bundle` - stores data of one or more commits in a binary file (the previous two approaches stored commits as 
plain text). 

The created bundle contains actual commit objects, not just their definition as text. This means that everything associated
with the commits is preserved, including the SHA1 & the commit parent(s). This basically means that all the potential issues 
identified with `git diff` & `git format-patch` are non-factors if `git bundle` is used. 

To consume the commits stored in a bundle, `git pull`, `git fetch` or even `git clone` can be used. A bundle object can
effectively be used as if it would be a remote git repository.

## ELI5: Examples

Let's go back to the initial example setup used as support in [Part1](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part1/):

```html
% git log --oneline 
b984a36 commit#6 (HEAD -> Roadrunner/master)
e0e0d59 commit#5
6ebe293 commit#4
94e007a commit#3 (HEAD -> Sloth/master)
f44f51a commit#2
dc557cd commit#1
```

Basically, Bob created **commit#4**, **commit#5** & **commit#6** on Roadrunner, and now he needs to send them over to 
Sloth. Sloth, as we can see, only knows about **commit#3**. 

This time, Bob will send his work using the newly discovered `git bundle` command:

```html
git bundle create 3commits.bundle 94e007a..master
```

This creates a file named `3commits.bundle` which stores all commits starting with `94e007a` (which is **commit#3**)
until the most recent commit on `master`. An alternative syntax, Bob can use:

```html
git bundle create 3commits.bundle -3 master
```

This is equivalent to the previous command, but this time Bob specified the number of commits that he wants to be 
included in the bundle. In this case, the number is "3", since only the last 3 commits on `master` are needed.

Once the bundle is created, as before, Bob sends it from Roadrunner to Sloth, via corporate email (his strategy served him
pretty well so far!). Before applying the bundle however, he decides to verify that the bundle is valid & that it was
correctly downloaded on Sloth. He does this with `git bundle verify`:

```html
% git bundle verify 3commits.bundle    
The bundle contains this ref:
b984a367325a8e6cc9c42a01a8b30cd3d5ceedca refs/heads/master
The bundle requires this ref:
94e007a5ea6f0276dc8b04d90e871afe00929cd3 
3commits.bundle is okay
```
We see that besides just the confirmation that the bundle is a valid object, the command also prints:
* the SHA1 & a [ref](https://git-scm.com/book/en/v2/Git-Internals-Git-References) for the "HEAD" (or most recent commit) 
stored in the bundle;
* the SHA1 of the parent commit on top of which this bundle can be applied on.
  * this SHA1 is very important, as it ensures the ["guarantee of history"](#apply-restrictions-guarantee-of-history) aspect.
    
Once Bob has confirmed that the bundle is valid, he applies it, using the *ref* printed by `git verify` (i.e. 
"refs/heads/master")  as the *source* ref, and *master* as the ref to the local, destination branch:

```html
# This is executed on the master branch
# Syntax:
#
# git pull  <bundle>     <ref in bundle>  :<dst branch>
#
git pull 3commits.bundle refs/heads/master:master
``` 

As mentioned before, the bundle can be regarded as being a "remote", from which we obtain the commits using `pull`, `fetch` 
or even `clone`. 

The output of the command:

```diff
From 3commits.bundle
   94e007a..b984a36  master     -> master
warning: fetch updated the current branch head.
fast-forwarding your working tree from
commit 94e007a5ea6f0276dc8b04d90e871afe00929cd3.
Already up to date.
```

Looks like just a normal fast-forward pull, doesn't it?

Now, just to be sure everything worked as expected, Bob runs `git log`:

```html
% git log --oneline
b984a36 (HEAD -> master) commit#6
e0e0d59 commit#5
6ebe293 commit#4
94e007a commit#3
f44f51a commit#2
dc557cd commit#1
```
If we look at the SHA1 of **commit#4**, **commit#5** and **commit#6**, and compare them with the SHA1's they had on 
Roadrunner, we will see that the SHA1 id's match! This basically acts as our 
[guarantee of contents](#sha1-guarantee-of-contents).

> What if I try to apply the bundle on top of a commit that's not **commit#3**?

Let's assume that Bob's history on Sloth actually looks like this:
 ```html
 % git log --oneline
 6ebe293 commit#4-v2 (HEAD -> master) 
 94e007a commit#3
 f44f51a commit#2
 dc557cd commit#1
 ```
 
If Bob would try to apply the same patch in this situation (same command as before) the result would be:
 
 ```html
 % git pull 3commits.bundle refs/heads/master:master
From 3commits.bundle
 ! [rejected]        master     -> master  (non-fast-forward) 
```

It would not work. This would happen because the commits in the bundle would be applied on a different parent. Git detects
this and **prevents it**. 

Similarly, if Bob would attempt to apply the bundle on a repository which does not have **commit#3**, git would prevent it:

```html
error: Repository lacks these prerequisite commits:
error: 94e007a5ea6f0276dc8b04d90e871afe00929cd3 
```

If we look once more at the the output of the `git verify`, we see the following message: `The bundle requires this ref: 
94e007a5ea6f0276dc8b04d90e871afe00929cd3` (the SHA1 id belongs to **commit#3**). According to the documentation of `git bundle verify`:

> This will list what commits you must have in order to extract from the bundle and will error out if you do not have them.

We learn that bundles need to be applied on a repository where the parent commit of the bundled commits exists in the 
history.

The 2 behaviors described above effectively represent the [guarantees of history](#apply-restrictions-guarantee-of-history) 
available to us when using bundle files.

Now, of course, there are ways to circumvent this safeguard regarding the changed parent commit, however this is not the 
point. The point is that the safeguards exist, that they are part of a well tested system and that when needed, we can
count on them to ensure consistency in our repository, and not on manual verification techniques, which are prone to 
mistakes & oversight.  

## Wrap-up

We saw how to use `git bundle`, which grants us the highest guarantees that the code is the same before & after being 
moved. This is in contrast with `git diff` & `git format-patch`, which both have various corner cases which they do not
fully cover.

Bob, finally found an approach he's satisfied with, and now can focus on getting things done! With this, this 3 post 
series comes to an end. 