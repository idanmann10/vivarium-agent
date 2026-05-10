# Eval Package

Selection signals, benchmarks, and compounding evaluation.

`packages/eval` owns synthetic benchmark logic that can run in CI. The current
focus is compounding evaluation: compare behavior before and after Dream
consolidation and report aggregate improvement or regression.

Eval cases should be deterministic, small, and explicit about their scoring
inputs. Use this package for benchmark helpers, before/after score aggregation,
and evidence that a Dream, retrieval, or memory change improves later runs.

Do not put live provider calls or GitHub state here. Live validation belongs in
CLI smoke commands and the world workflows; evals should remain reproducible.
