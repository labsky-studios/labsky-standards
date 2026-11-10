---
name: plan-feature
description: Break a feature or idea into PR-sized GitHub issues for a Labsky project. Use when the user wants to plan work before coding, or asks to turn a request into tasks or issues. Drafts the plan with the planner agent, shows it, and creates the issues only after the user approves.
argument-hint: <feature or idea>
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(gh issue *), Bash(gh label list *), Bash(gh repo view *)
---

Plan `$ARGUMENTS` as a sequence of GitHub issues, one per pull request.

## Steps

1. If `$ARGUMENTS` is empty or too vague to plan (no clear outcome), ask the user what the outcome should be. Do not guess.
2. Delegate the draft to the `labsky:planner` agent, passing the request verbatim plus anything the user said in this conversation that constrains it.
3. Show the user the plan the planner returned, unchanged except for trimming. If it lists questions for a human, ask them now and send the answers back to the planner for a revised plan.
4. Ask the user to approve the slices before creating anything. Creating issues publishes them to the repository: never do it without a clear yes in this conversation.
5. On approval, create one issue per slice, in order, with `gh issue create`:
   - Title: the slice heading without its number (`feat(projects): add project list page`).
   - Labels: the slice's labels, plus `planned`. Create a missing label first with `gh label create <name> --force`.
   - Body, in the user's language:

     ```markdown
     ## Context
     <context>

     ## Acceptance criteria
     - [ ] ...

     ## Out of scope
     ...

     ## Pending from the client
     ...

     ## For the implementer
     - Branch: `<branch>`
     - Depends on: #<issue> (or none)
     - Size: <S|M|L>
     - Files: ...
     - Docs to read: ...
     ```

   Replace slice numbers in "Depends on" with the real issue numbers as they are created.
6. Report the created issues as a list of links, and say that `/labsky:ship <number>` implements one.

## What NOT to do

- Never create, edit or close issues before the user approves the plan
- Never start implementing a slice in this skill
- Never fill a pending-content gap with invented text
