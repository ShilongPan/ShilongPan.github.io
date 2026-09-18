---
layout: post
title: "Trenchcoat Protocol"
date: 2026-08-14
author: Shilong Pan
thumbnail: /images/20260814/20260814blogimg.jpg
caption: "Working at my desk while building this site."
abstract: "I guess the outcome isn't that surprising if you're reading this."
---
The three judges of the underworld: Minos, Rhadamanthus, and Aeacus. The three wise men. The minimal number of data points to create statistically meaningful data. A king's hand, a council of eunechs, NERV. 

3 is a fantastic number of opinions to ask before making a decision


Small large language models can be run natively on consumer hardware with great success, but lack extensive knowledge libraries. They have impressive coding abilities and capability to do digital labour, though they can still hallucinate and make mistakes.

I have been using these local llm's to write this website's code, analyze and evaluate my own work, and explore its possible use cases.

I have noticed many of the errors they can make, and wanted to make a protocol to address its own workflows and be somewhat independent, so that it can accomplish tasks I can't such as codework.

The idea is to provide the same prompt to multiple LLMs from different developers. These could be Qwen3.8 27B, Gemma 4 26B A4B QAT, and Muse Glimmer, for example. After the initial outputs are provided, another LLM, either one of the three or potentially a smaller, faster model, depending on what we want, could analyze the outputs, finding commonalities, differences, mistakes, and weigh the value of each individual result, whether its language, code, or other work. Then the winning prompt and the desirable attributes from the other outputs could be fed back to the originator LLM for integration, followed by a final code review by another one. 

The theory is that this provides writing and output covering the largest amount of training data possible, and thus covers the things that are common weaknesses of local llms. The review phase should also reduce the number of mistakes that need to be corrected by human operators.

For the time being, I'd like to try doing this manually, and compare the results with the current top dog local small model, Qwen 3.8, and see if the result is worth it. It definitely won't be worth it in terms of machine hours, but I can leave an inference machine running overnight to do thinking while I sleep.


The types of input I would be using for it are as follow
 - Here's some existing code, I need you to figure out what is broken, here are the observations
 - Here's something I need to do, the inputs, outputs, functions I need it to do. Build a planned layout of how to code this
 - Summarize this document into a rubric to compare my work against.
 - use this rubric or guide to review my work, tell me what needs to be fixed or added or removed
    - I used an early version of this protocol in my med school application this year, to what I feel was good success
    - although individual models made random weird mistakes, overall the trends in missing elements they saw were consistent, and that was valuable
    - only having one model generate a rubric was a little sketchy however, and I think I could notice the artifacting from this in how much the reviewers really cared about specific elements.


 A lot of it is plan vs execute (higher vs lower thinking)

 Training ai to write like I do would be an interesting project, but it would be a little too deep of a rabbit hole for a type of output I am not yet comfortable with.


 Maybe instead of a consistent workflow, its an interface with a single operator step: input prompt. The interface feeds it to the three llms individually, then asks a most trusted llm to review all three and produce the review output as described above. Then, the selected best method and the desired changes and additions are fed, before an output is finally returned to the user. This way, the user can still have a lot of authority over the number of review steps, while still getting a well vetted result each time.

 In terms of hardware, this would be able to be run on a system with enough capacity to run a single llm, such as 24gb vram. however, a parallel system with maybe 64-96 gb of vram would be much faster, especially since MoE models don't need as much vram

 A system with a minimal amount of dram and then an expandable amount of vram would be ideal. maybe using a small array of v100s

 