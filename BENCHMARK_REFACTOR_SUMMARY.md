# Benchmark Refactor Summary

## Outputs
- Reduced main benchmark: `Eval Files/context_graph_retrieval_benchmark_v2.json`
- Bug/PR subset: `Eval Files/context_graph_bug_pr_benchmark_subset.json`

## Question Counts
- Original benchmark questions: 150
- Retained in reduced benchmark: 81
- Removed from reduced benchmark: 69
- Bug/PR subset questions added: 12

## Reduced Benchmark Distribution
- information_extraction: 8
- multi_hop_retrieval: 30
- knowledge_update: 16
- temporal_reasoning: 12
- debugging_and_provenance: 15

## Reduced Benchmark Notes
- Preferred harder questions from the 150-question source set.
- Preserved all five reasoning categories.
- Biased selection toward multi-artifact questions with higher hop counts.
- Kept original question IDs in the reduced benchmark for traceability.

## Bug/PR Subset Distribution
- information_extraction: 0
- multi_hop_retrieval: 12
- knowledge_update: 4
- temporal_reasoning: 2
- debugging_and_provenance: 12

## Remote GitHub Artifacts Used
- PR #7: `https://github.com/dkucz/order-management-service-extended/pull/7`
- PR #8: `https://github.com/dkucz/order-management-service-extended/pull/8`
- PR #9: `https://github.com/dkucz/order-management-service-extended/pull/9`
- PR #10: `https://github.com/dkucz/order-management-service-extended/pull/10`
- PR #11: `https://github.com/dkucz/order-management-service-extended/pull/11`

## Constraints Followed
- No existing repository artifacts were deleted.
- No runtime application logic was modified.
- New benchmark files and support artifacts were additive only.
