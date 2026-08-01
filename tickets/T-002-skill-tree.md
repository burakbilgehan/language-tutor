---
id: T-002
title: Skill tree (branching lesson graph) instead of a linear path
status: backlog
priority: p3
effort: XL
confidence: low
depends: []
created: 2026-07-17
---
Today's model is a single chain (nodes.prereqNodeId). Idea: a game-style skill
tree, where some lessons are parallel/independent, a lesson can unlock more than
one lesson, and unlocking a lesson can require finishing more than one lesson
(n-of-m).

Proposal (not a fully free DAG): 2-3 parallel branches within a level, merging
(diamond) at the end of the level. Needed: a node_prereqs join table (+ a SAVE
bump), an unlock rule, branch structure in the curriculum prompt, branching
rendering in RoadmapView (the main effort), and multi-tail awareness in
auto-extend.
Burak: "leave it for now, let's just keep it as an idea."
