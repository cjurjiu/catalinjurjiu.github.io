---
title: "Git: Send commits through mail - Part 1"
excerpt_separator: "<!--more-->"
categories:
  - Git
tags:
  - Git
---

Sometimes one needs to get creative in order to complete the job.<!--more-->

This is a 3-part series, with this being the first part. 
[Part 2](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part2) & 
[Part 3](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part3) are already available.

## Scenario 

Bob works as a consultant for a corporation with stringent security rules. Among others, these rules drastically limit 
access to the project's Git repository.

For Bob to be able to access the code, he either needs to be on-site (and plug his MacBook -nicknamed "Roadrunner"- to 
to the internal network via an Ethernet cable), or he needs to code using the laptop received from the client (nicknamed 
"Sloth").

> "I'll just use *Sloth*, when I'm not on-site." - Bob, an optimist

The issue? Sloth was slow. Cargo-ship-on–a-storm slow. 

When using Sloth, Bob soon realized there's enough time for a coffee and some friendly morning chat between the time he 
double clicked the Android Studio icon and until Android Studio was open. 

Bob was also forced to use the Android Emulator when testing his code, because Sloth's security rules prevented any kind 
of USB devices from being used  ¯\\\_(ツ)_/¯. The Android Emulator **is not** known for its "performance" on "low end" 
machines.

All in all, Bob was having a hard time...until he decided to <nobr>
<a href="https://www.youtube.com/watch?v=SMTDQZzQMKk" target="blank">do something</a><sup> (sound warning)</sup> </nobr> about it.

Bob's plan? Code on Roadrunner, then send his work to Sloth, via corporate email. Once the code is on Sloth, perform a 
push to send the changes to the remote.

So basically: develop & test on Roadrunner, only use Sloth for communication with the remote. Sync the two machines via 
email. Neat.

## Options

Fun aside, let's go through 3 ways of achieving this: 
- `git diff` (this article) 
- `git format-patch` ([Part 2](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part2))
- `git bundle` ([Part 3](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part3))

They are all similar in that they all save the diff between 2 commits to a file. However, there are certain significant
differences between them.

## `git diff` - using patches

A "patch" is usually referred to as being a file which stores the output of a `git diff` command. 

Syntax:

{% highlight bash %}
git diff old_commit new_commit
{% endhighlight %} 

`git diff` outputs the differences introduced by **new_commit** on top of **old_commit** in a way Git  understands. It's
effectively a Git version of the standard shell [`diff`](https://www.computerhope.com/unix/udiff.htm). 

So let's assume we have the following file (`CoolFeature.java`) created by our protagonist, Bob, through 4 commits:

{% highlight java linenos %}
Bob is a truly great developer.                //commit#1
He usually writes his own code.                //commit#2
If copying StackOverflow answers counts.       //commit#3
But his lead doesn't know.                     //commit#4
{% endhighlight %}

`git log --oneline` prints:

{% highlight bash %}
6ebe293 commit#4 (HEAD -> master)
94e007a commit#3
f44f51a commit#2
dc557cd commit#1
{% endhighlight %}

If we want to see just the changes between **commit#4** & **commit#3**, we can invoke:

{% highlight bash %}
git diff 35bb1f5 fa746a1
{% endhighlight %}

Where **94e007a** is the sha1 of **commit#3** and **6ebe293** the sha1 of **commit#4**.

The output is:

{% highlight diff linenos %}
diff --git a/CoolFeature.java b/CoolFeature.java
index 84fa290..c619c2e 100644
--- a/CoolFeature.java
+++ b/CoolFeature.java
@@ -1,3 +1,4 @@
 Bob is a truly great developer.
 He usually writes his own code.
-If copying StackOverflow answers counts.
\ No newline at end of file
+If copying StackOverflow answers counts.
+But his lead doesn't know.
\ No newline at end of file
{% endhighlight %}

The complete content of the file is beyond the scope of this article (although you can learn more 
[here](https://git-scm.com/docs/git-diff#_generating_patches_with_p)), however we can see at line 11 that `git diff` 
recognized that line "But his lead doesn't know." was added in **commit#4**. 

Another relevant point is that the output above is printed in the terminal in which `git diff` is invoked. To save the 
output above in a file named `diff_commit4.txt` instead, we need to run:

{% highlight bash %}
git diff 35bb1f5 fa746a1 > diff_commit4.txt
{% endhighlight %} 

Now, going back to Bob's situation, let's assume Sloth knows about **commit#3** from above. **commit#4** however was
developed by Bob using Roadrunner, and now Bob needs to send the changes performed in **commit#4** back to Sloth, in order
for him to be able to push the changes to the his remote and finally open that pull request. 

So he saves the diff between the two commits to a file using `git diff`, and then sends `diff_commit4.txt` (via an email to 
himself) over to Sloth. Now, to apply the diff, he can just invoke:
 
{% highlight bash %}
cd bob_project
git apply diff_commit4.txt
{% endhighlight %}

Running `git status` at this point will show:
{% highlight bash linenos %}
On branch master
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   CoolFeature.java

no changes added to commit (use "git add" and/or "git commit -a")
{% endhighlight %} 

Bob seems to have some changes in `CoolFeature.java`! Taking a closer look at Bob's file, we'll see that line #4 will be present:
 
{% highlight java linenos %}
Bob is a truly great developer.                //commit#1
He usually writes his own code.                //commit#2
If copying StackOverflow answers counts.       //commit#3
But his lead doesn't know.                     //not yet commited
{% endhighlight %}

At this point, Bob can write again the commit message, perform the commit, and finally push the code to the remote. Great!

A patch can also be applied in ['reverse'](https://git-scm.com/docs/git-apply#git-apply---reverse). Very useful when 
trying to undo changes introduced by ore or more commits across multiple files.
{: .notice--info}

### Limitations

#### Ensuring consistency

> At this point, Bob can **write again the commit message, perform the commit,** and finally push the code to the remote. Great!

Great, not-so-great. 

Re-doing the commits means that the commits on the other end (Sloth in Bob's case) have all new:
* commit author & committer;
* commit time;
* SHA1 ID's.

In particular, the fact that SHA1 ID's change is problematic. In certain cases, doing a rebase might require more work, 
to ensure that it is done correctly & that its results are properly shared between machines. Additionally, a rebase also 
changes the hashes of the commits it touches, making it that much harder to see exactly which rebased commit on Sloth 
corresponds to which commit pre-rebase on Roadrunner.  

Finally, there's the issue of the changed time. Since the commits will most likely be applied rather fast one after another,
the history will not reflect the actual time spent on implementing the features associated with them. Instead, you'll
look like the most productive developer alive! (over a span of ~4 minutes) 

Some may say this is not all that important (Bob included), and I partially agree to this. However, this might cause 
confusion in the future where the order of things might suddenly become relevant for various reasons. Also, not having 
accurate VCS history basically means throwing out the window 50% of the benefits of using a VCS at all.  

Of course, we can [override the time of each commit](https://stackoverflow.com/a/454750/2220337) to be whatever we want, 
but this would have to be performed for each commit. This brings us to our final point.

#### Scalability
What if we had to send 3 commits from Roadrunner to Sloth, instead of 1? Having the same history as above: 

{% highlight java linenos %}
Bob is a truly great developer.                dc557cd commit#1 
He usually writes his own code.                f44f51a commit#2
If copying StackOverflow answers counts.       94e007a commit#3
But his lead doesn't know.                     6ebe293 commit#4 (HEAD -> master)
{% endhighlight %}

Let's see what `git diff` outputs if we run it on **commit#1** & **commit#4**:

{% highlight bash %}
git diff dc557cd 6ebe293 > bob_3_commits.txt 
{% endhighlight %}

The output is:

{% highlight diff linenos %}
diff --git a/CoolFeature.java b/CoolFeature.java
index fcecd15..c619c2e 100644
--- a/CoolFeature.java
+++ b/CoolFeature.java
@@ -1 +1,4 @@
-Bob is a truly great developer.
\ No newline at end of file
+Bob is a truly great developer.
+He usually writes his own code.
+If copying StackOverflow answers counts.
+But his lead doesn't know.
\ No newline at end of file
{% endhighlight %}

Spot the issue?
 
We see at lines 9, 10 & 11 that `git diff` correctly identifies the content added in **commit#2**, 
**commit#3** and **commit#4**. However, the information about what changes were performed (what lines were added in this
example) in which commit **has been lost**. This basically acts similar to a [squash](https://stackoverflow.com/a/5309051/2220337).

One way to avoid this would be to save multiple diffs, and then apply them one by one, in the correct order at the other 
end. 

So basically, on Roadrunner: 

{% highlight bash %}
# commit 3 -> commit 4
git diff 94e007a 6ebe293 > bob_commit4.txt

# commit 2 -> commit 3 
git diff f44f51a 94e007a > bob_commit3.txt 

# commit 1 -> commit 2
git diff dc557cd f44f51a > bob_commit2.txt  
{% endhighlight %} 

Send the files via mail, and then on Sloth:

{% highlight bash %}
# apply commit 2 over commit 1
git apply bob_commit2.txt
# add changes to index  
git add .
# perform the commit
git commit -m "commit#2"

# apply commit 3 over commit 2 
git apply bob_commit3.txt
# add changes to index
git add .
# perform the commit
git commit -m "commit#3" 

# apply commit 4 over commit 3
git apply bob_commit4.txt
# add changes to index
git add .
# perform the commit
git commit -m "commit#4"
{% endhighlight %}

As we can see, this is a lot of work (all the commit messages need to be rewritten), and there are a lot of things that 
need to be done right in order for everything to end up ok at the other end. 

What if we re-enter a wrong commit message? What if the diff in file `bob_commit4.txt` actually belongs to **commit#2** 
because we copied the wrong hash? And all of this doesn't even include the commands we need to write if we want to set 
a relevant commit time for each commit.

Needless to say, this is too error prone to be a viable solution for the long term. Plus, we're living in modern times...
Surely there are better options? (hint: there are)

## Conclusions

Bob seems to have found a solution in the first day of working with his weird setup. However, he also quickly identified
the limitations of this approach.

In [Part 2](http://www.catalinjurjiu.com/git/git-send-commits-through-mail-part2), we will continue Bob's 'adventure' 
to see what clever solution he found to some of these limitations. 