# World Package

Git and GitHub access, retrieval, subscriptions, contributors, and publication paths.

`packages/world` owns local world reading, retrieval, subscriptions, git pull
helpers, proposal serialization, GitHub write clients, contributor metadata, and
visibility routing.

Read paths should come before write paths. Search must preserve source labels
across canonical and private subscriptions so planning context can explain where
a skill, trace, run, or anti-pattern came from.

Write paths create local proposal artifacts first, then optionally open GitHub
pull requests when math gates and evidence pass. Public visibility targets the
canonical world; private and internal visibility can route to an auto-push
private subscription.
