# Teacher reporting measurements — 2026-10-01

## Baseline — executed before feature source edits

Named benchmark head: `82fd04592da3abec8ff933923252825ef07d59b3`; unchanged runtime: `ec74cf3882b8a2dafc9f9c1e0d70e24c496364d0`. GitHub Actions [run 36861089263](https://github.com/aranya-squad/Bolt-V1/actions/runs/36861089263), PostgreSQL16.15, Redis7.4.11, Python3.12. Raw artifact ZIP11160734134, archive SHA256 `fe3afc5f28d1d709747ecc8922ab518eeda793574af6f4d1f4555c0a421235ac`, retained until2026-10-31. Extracted JSON SHA256 `ed1057d4aa8faa6d8541bfce01fc54b67974669f89e8247fb5cee0208ed06062`.

All24 fixtures /144requests completed. Each request has **one separately counted JWT authentication SELECT and two transaction/savepoint queries**. Table cells are **data SELECT count; SQL ms / non-SQL endpoint ms / total endpoint ms**. Returned rows: list/matrix = class count, roster = active student count. Fixture has full overlapping membership, one inactive student per five active (minimum one),14lessons,10levels,2or20persisted sessions per student,1or8CLASSWORK level completions,1or14lesson completions per kind. Accurate counts include directly seeded history; they are separate from real-finalization evidence.

| Active students | Classes | History | Cache | List: data; ms | Roster: data; ms | Matrix: data; ms |
|---:|---:|---|---|---|---|---|
| 5 | 1 | short | cold | 3; 2.835 / 11.457 / 14.292 | 27; 12.548 / 24.213 / 36.761 | 6; 4.086 / 7.113 / 11.199 |
| 5 | 1 | short | warm | 3; 1.583 / 4.467 / 6.050 | 7; 3.571 / 9.925 / 13.496 | 6; 3.133 / 6.281 / 9.413 |
| 5 | 1 | long | cold | 3; 1.799 / 4.571 / 6.370 | 27; 9.773 / 19.880 / 29.653 | 6; 3.365 / 5.630 / 8.995 |
| 5 | 1 | long | warm | 3; 1.690 / 3.828 / 5.518 | 7; 3.627 / 8.185 / 11.812 | 6; 3.284 / 5.725 / 9.009 |
| 5 | 5 | short | cold | 7; 3.660 / 8.308 / 11.968 | 27; 10.474 / 22.597 / 33.070 | 14; 6.015 / 11.552 / 17.567 |
| 5 | 5 | short | warm | 7; 3.087 / 8.363 / 11.450 | 7; 4.345 / 8.864 / 13.209 | 14; 5.376 / 11.460 / 16.836 |
| 5 | 5 | long | cold | 7; 3.384 / 7.941 / 11.326 | 27; 10.553 / 20.675 / 31.228 | 14; 6.743 / 12.235 / 18.977 |
| 5 | 5 | long | warm | 7; 3.035 / 7.380 / 10.415 | 7; 3.417 / 8.427 / 11.844 | 14; 6.273 / 11.894 / 18.166 |
| 5 | 20 | short | cold | 22; 7.751 / 19.990 / 27.742 | 27; 9.400 / 19.900 / 29.300 | 44; 16.060 / 32.697 / 48.757 |
| 5 | 20 | short | warm | 22; 7.361 / 20.005 / 27.365 | 7; 2.997 / 7.959 / 10.956 | 44; 16.117 / 34.176 / 50.293 |
| 5 | 20 | long | cold | 22; 7.745 / 19.406 / 27.151 | 27; 9.608 / 21.660 / 31.268 | 44; 17.280 / 33.771 / 51.051 |
| 5 | 20 | long | warm | 22; 7.415 / 19.422 / 26.837 | 7; 3.049 / 8.070 / 11.119 | 44; 17.217 / 33.163 / 50.380 |
| 10 | 1 | short | cold | 3; 2.094 / 4.585 / 6.679 | 52; 18.521 / 36.714 / 55.235 | 6; 3.209 / 5.820 / 9.029 |
| 10 | 1 | short | warm | 3; 1.699 / 4.027 / 5.726 | 12; 4.859 / 12.582 / 17.441 | 6; 2.737 / 5.701 / 8.437 |
| 10 | 1 | long | cold | 3; 1.923 / 4.670 / 6.593 | 52; 17.266 / 35.972 / 53.238 | 6; 3.281 / 6.125 / 9.406 |
| 10 | 1 | long | warm | 3; 1.593 / 4.152 / 5.745 | 12; 4.694 / 13.473 / 18.167 | 6; 3.213 / 5.833 / 9.046 |
| 10 | 5 | short | cold | 7; 3.381 / 8.259 / 11.640 | 52; 18.478 / 36.381 / 54.859 | 14; 6.135 / 12.497 / 18.632 |
| 10 | 5 | short | warm | 7; 3.108 / 7.724 / 10.831 | 12; 4.520 / 13.033 / 17.554 | 14; 5.827 / 12.373 / 18.200 |
| 10 | 5 | long | cold | 7; 3.093 / 8.866 / 11.959 | 52; 17.886 / 38.577 / 56.463 | 14; 6.531 / 13.755 / 20.286 |
| 10 | 5 | long | warm | 7; 2.759 / 8.392 / 11.151 | 12; 4.739 / 13.529 / 18.269 | 14; 6.174 / 12.984 / 19.157 |
| 10 | 20 | short | cold | 22; 8.148 / 68.002 / 76.150 | 52; 17.327 / 34.891 / 52.218 | 44; 18.442 / 39.788 / 58.231 |
| 10 | 20 | short | warm | 22; 7.827 / 21.240 / 29.067 | 12; 4.521 / 12.518 / 17.039 | 44; 21.344 / 46.114 / 67.458 |
| 10 | 20 | long | cold | 22; 8.028 / 23.263 / 31.290 | 52; 18.140 / 38.515 / 56.655 | 44; 20.765 / 36.770 / 57.536 |
| 10 | 20 | long | warm | 22; 7.704 / 22.158 / 29.861 | 12; 4.746 / 12.999 / 17.745 | 44; 19.591 / 35.682 / 55.273 |
| 50 | 1 | short | cold | 3; 2.236 / 5.562 / 7.798 | 252; 78.619 / 167.924 / 246.543 | 6; 3.972 / 7.616 / 11.587 |
| 50 | 1 | short | warm | 3; 1.673 / 5.017 / 6.690 | 52; 18.135 / 48.694 / 66.828 | 6; 3.261 / 7.437 / 10.698 |
| 50 | 1 | long | cold | 3; 1.947 / 5.891 / 7.838 | 252; 82.725 / 226.870 / 309.595 | 6; 4.171 / 7.443 / 11.614 |
| 50 | 1 | long | warm | 3; 1.695 / 5.175 / 6.870 | 52; 16.597 / 48.235 / 64.832 | 6; 3.978 / 7.385 / 11.362 |
| 50 | 5 | short | cold | 7; 3.867 / 12.792 / 16.660 | 252; 81.182 / 169.205 / 250.387 | 14; 8.907 / 19.735 / 28.641 |
| 50 | 5 | short | warm | 7; 3.427 / 12.804 / 16.231 | 52; 16.182 / 50.039 / 66.221 | 14; 8.506 / 19.940 / 28.446 |
| 50 | 5 | long | cold | 7; 4.042 / 12.967 / 17.008 | 252; 84.265 / 169.153 / 253.418 | 14; 11.407 / 19.743 / 31.150 |
| 50 | 5 | long | warm | 7; 3.481 / 12.376 / 15.857 | 52; 16.740 / 50.000 / 66.740 | 14; 10.915 / 20.031 / 30.945 |
| 50 | 20 | short | cold | 22; 9.547 / 39.728 / 49.275 | 252; 79.388 / 170.691 / 250.078 | 44; 30.162 / 66.324 / 96.486 |
| 50 | 20 | short | warm | 22; 9.314 / 39.805 / 49.120 | 52; 16.520 / 49.441 / 65.960 | 44; 30.422 / 65.809 / 96.230 |
| 50 | 20 | long | cold | 22; 9.352 / 94.601 / 103.954 | 252; 79.505 / 169.738 / 249.243 | 44; 36.505 / 65.082 / 101.587 |
| 50 | 20 | long | warm | 22; 9.357 / 40.318 / 49.675 | 52; 16.597 / 49.979 / 66.576 | 44; 36.543 / 64.498 / 101.041 |
| 150 | 1 | short | cold | 3; 2.508 / 7.512 / 10.020 | 752; 238.452 / 502.330 / 740.783 | 6; 4.953 / 11.815 / 16.767 |
| 150 | 1 | short | warm | 3; 1.927 / 7.187 / 9.115 | 152; 44.510 / 139.780 / 184.290 | 6; 4.767 / 10.980 / 15.747 |
| 150 | 1 | long | cold | 3; 2.435 / 7.587 / 10.022 | 752; 241.748 / 500.820 / 742.568 | 6; 6.285 / 10.937 / 17.222 |
| 150 | 1 | long | warm | 3; 1.982 / 7.162 / 9.143 | 152; 46.490 / 205.865 / 252.355 | 6; 5.916 / 10.754 / 16.671 |
| 150 | 5 | short | cold | 7; 5.265 / 23.721 / 28.986 | 752; 236.233 / 508.553 / 744.786 | 14; 15.247 / 36.440 / 51.688 |
| 150 | 5 | short | warm | 7; 5.054 / 23.343 / 28.397 | 152; 47.027 / 138.419 / 185.446 | 14; 15.108 / 36.335 / 51.443 |
| 150 | 5 | long | cold | 7; 5.221 / 25.899 / 31.120 | 752; 240.208 / 500.212 / 740.419 | 14; 22.516 / 37.386 / 59.902 |
| 150 | 5 | long | warm | 7; 5.050 / 36.122 / 41.172 | 152; 49.464 / 139.944 / 189.407 | 14; 22.592 / 37.498 / 60.090 |
| 150 | 20 | short | cold | 22; 14.309 / 84.507 / 98.815 | 752; 236.745 / 501.596 / 738.341 | 44; 53.880 / 130.802 / 184.682 |
| 150 | 20 | short | warm | 22; 13.176 / 149.514 / 162.691 | 152; 45.624 / 141.661 / 187.285 | 44; 51.549 / 196.145 / 247.694 |
| 150 | 20 | long | cold | 22; 12.767 / 81.053 / 93.820 | 752; 324.976 / 505.918 / 830.894 | 44; 82.794 / 135.455 / 218.249 |
| 150 | 20 | long | warm | 22; 12.158 / 80.641 / 92.800 | 152; 48.852 / 142.581 / 191.434 | 44; 81.790 / 136.516 / 218.305 |

## Plan inspection and limitations

Fixtures are ANALYZEd before requests, outside timing. EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) inspects representative deduplicated SELECT shapes after each timed request. At150active students/20classes/longhistory, list includes a sequential enrollment scan returning3600rows plus repeated count aggregates; roster includes150profile rows and repeated student statistics/accuracy aggregate reads; matrix scans3600enrollments, includes180members per class (inactive membership bug) and repeats28completion aggregate rows per class. These plans establish amplification/correctness defects; they do not justify new indexes without candidate evidence.

Cold/warm refers to isolated Redis application-cache state, not reset PostgreSQL buffers. There is one timing sample per mode/fixture; no statistical speedup or production capacity claim. Requests run in an outer rolled-back fixture transaction; savepoint overhead is separate. All classes fully overlap students, so disjoint/mixed roster latency is not measured. Directly seeded completions are reporting measurements, not finalization evidence. No live database, real student or deployment is used.

An earlier run36860777240 is **rejected for complete-baseline evidence**: Django cumulative9000query ring truncated the final scenario. The named corrected harness resets captured query state for every request and refuses a mismatch with timed SQL executions.

## F1 candidate — executed

Named head `e7b81dc4dc258f5efa62d256952a38a901729b97`, [run36862384546](https://github.com/aranya-squad/Bolt-V1/actions/runs/36862384546). Full backend suite: **273passed, zero failures/errors/skips**, including the separate stale database alias simulating replica lag (not streaming replication). All144measurements meet **list1 / roster4 / matrix4** data SELECTs, one auth SELECT/two savepoint queries each. Returned row counts and active membership agree. Archive11162121067 SHA256 `00092f9f8bcfc278cee07b4693b92c1fbc426398aac7cbc68bdbb3d1dbaa1829`; JSON SHA256 `735119db32048ab322473f36949ededa0ef675a0d9c8ffd0c888e54200dcf48c`. JUnit archive11162285902; retained until2026-10-31.

Same cell convention/fixture/cache limitations as baseline.

| Active students | Classes | History | Cache | List: data; ms | Roster: data; ms | Matrix: data; ms |
|---:|---:|---|---|---|---|---|

| 5 | 1 | short | cold | 1; 2.208 / 9.194 / 11.402 | 4; 3.233 / 5.420 / 8.653 | 4; 3.401 / 5.221 / 8.623 |
| 5 | 1 | short | warm | 1; 1.246 / 2.902 / 4.148 | 4; 2.360 / 4.855 / 7.215 | 4; 3.596 / 4.549 / 8.145 |
| 5 | 1 | long | cold | 1; 1.210 / 3.160 / 4.370 | 4; 2.460 / 4.799 / 7.259 | 4; 2.762 / 4.820 / 7.583 |
| 5 | 1 | long | warm | 1; 1.029 / 2.549 / 3.577 | 4; 2.195 / 4.516 / 6.710 | 4; 2.464 / 4.559 / 7.023 |
| 5 | 5 | short | cold | 1; 1.344 / 2.977 / 4.321 | 4; 2.462 / 4.468 / 6.930 | 4; 3.033 / 4.719 / 7.752 |
| 5 | 5 | short | warm | 1; 1.106 / 2.909 / 4.015 | 4; 2.167 / 4.685 / 6.852 | 4; 2.775 / 4.849 / 7.624 |
| 5 | 5 | long | cold | 1; 1.190 / 3.303 / 4.493 | 4; 2.508 / 4.768 / 7.276 | 4; 3.234 / 5.578 / 8.812 |
| 5 | 5 | long | warm | 1; 1.087 / 2.719 / 3.806 | 4; 2.212 / 4.505 / 6.716 | 4; 3.041 / 5.381 / 8.422 |
| 5 | 20 | short | cold | 1; 1.383 / 3.498 / 4.880 | 4; 2.380 / 4.707 / 7.087 | 4; 3.160 / 5.682 / 8.842 |
| 5 | 20 | short | warm | 1; 1.174 / 3.564 / 4.738 | 4; 2.469 / 5.601 / 8.070 | 4; 2.863 / 5.877 / 8.741 |
| 5 | 20 | long | cold | 1; 1.342 / 4.003 / 5.345 | 4; 2.437 / 4.658 / 7.095 | 4; 5.050 / 7.358 / 12.408 |
| 5 | 20 | long | warm | 1; 1.156 / 3.495 / 4.650 | 4; 2.144 / 4.613 / 6.757 | 4; 4.864 / 7.570 / 12.434 |
| 10 | 1 | short | cold | 1; 1.438 / 2.790 / 4.228 | 4; 2.859 / 5.763 / 8.622 | 4; 2.656 / 4.771 / 7.427 |
| 10 | 1 | short | warm | 1; 1.056 / 2.549 / 3.605 | 4; 2.140 / 5.162 / 7.302 | 4; 2.359 / 4.534 / 6.893 |
| 10 | 1 | long | cold | 1; 1.261 / 3.244 / 4.505 | 4; 2.539 / 5.346 / 7.886 | 4; 3.362 / 5.164 / 8.527 |
| 10 | 1 | long | warm | 1; 0.989 / 2.645 / 3.633 | 4; 2.227 / 4.954 / 7.182 | 4; 2.661 / 4.587 / 7.248 |
| 10 | 5 | short | cold | 1; 1.442 / 2.954 / 4.396 | 4; 2.398 / 5.547 / 7.945 | 4; 2.821 / 4.969 / 7.789 |
| 10 | 5 | short | warm | 1; 1.064 / 2.760 / 3.823 | 4; 2.135 / 5.124 / 7.259 | 4; 2.658 / 4.920 / 7.578 |
| 10 | 5 | long | cold | 1; 1.419 / 3.363 / 4.783 | 4; 2.796 / 5.326 / 8.122 | 4; 4.106 / 5.394 / 9.500 |
| 10 | 5 | long | warm | 1; 1.237 / 2.725 / 3.962 | 4; 2.497 / 4.949 / 7.446 | 4; 3.812 / 5.316 / 9.128 |
| 10 | 20 | short | cold | 1; 1.430 / 3.714 / 5.144 | 4; 2.543 / 4.936 / 7.478 | 4; 3.425 / 5.512 / 8.938 |
| 10 | 20 | short | warm | 1; 1.199 / 3.469 / 4.668 | 4; 2.218 / 5.193 / 7.412 | 4; 3.142 / 5.441 / 8.583 |
| 10 | 20 | long | cold | 1; 1.358 / 4.004 / 5.362 | 4; 2.726 / 5.164 / 7.891 | 4; 7.771 / 7.815 / 15.586 |
| 10 | 20 | long | warm | 1; 1.153 / 3.551 / 4.704 | 4; 2.327 / 5.309 / 7.636 | 4; 7.555 / 7.711 / 15.267 |
| 50 | 1 | short | cold | 1; 1.415 / 3.164 / 4.579 | 4; 3.470 / 8.588 / 12.059 | 4; 2.996 / 4.500 / 7.496 |
| 50 | 1 | short | warm | 1; 1.040 / 2.665 / 3.705 | 4; 2.973 / 8.186 / 11.160 | 4; 2.770 / 4.521 / 7.292 |
| 50 | 1 | long | cold | 1; 1.303 / 3.388 / 4.691 | 4; 3.563 / 8.756 / 12.318 | 4; 3.968 / 4.824 / 8.792 |
| 50 | 1 | long | warm | 1; 1.038 / 2.596 / 3.634 | 4; 3.164 / 8.497 / 11.661 | 4; 4.430 / 4.675 / 9.104 |
| 50 | 5 | short | cold | 1; 1.486 / 3.434 / 4.920 | 4; 3.375 / 8.615 / 11.990 | 4; 3.717 / 4.797 / 8.515 |
| 50 | 5 | short | warm | 1; 1.169 / 2.820 / 3.989 | 4; 3.273 / 8.865 / 12.139 | 4; 3.268 / 4.834 / 8.102 |
| 50 | 5 | long | cold | 1; 1.451 / 3.550 / 5.001 | 4; 3.861 / 8.459 / 12.319 | 4; 9.757 / 5.394 / 15.151 |
| 50 | 5 | long | warm | 1; 1.129 / 2.749 / 3.879 | 4; 3.269 / 8.467 / 11.735 | 4; 9.300 / 5.558 / 14.857 |
| 50 | 20 | short | cold | 1; 1.812 / 4.340 / 6.152 | 4; 3.450 / 8.465 / 11.915 | 4; 6.474 / 6.121 / 12.595 |
| 50 | 20 | short | warm | 1; 1.463 / 3.544 / 5.008 | 4; 2.982 / 8.653 / 11.636 | 4; 5.828 / 5.748 / 11.576 |
| 50 | 20 | long | cold | 1; 1.907 / 4.123 / 6.030 | 4; 3.790 / 8.407 / 12.197 | 4; 30.628 / 7.241 / 37.868 |
| 50 | 20 | long | warm | 1; 1.528 / 3.434 / 4.962 | 4; 3.381 / 8.310 / 11.691 | 4; 29.786 / 8.625 / 38.411 |
| 150 | 1 | short | cold | 1; 1.528 / 3.240 / 4.768 | 4; 5.317 / 16.747 / 22.064 | 4; 3.320 / 4.645 / 7.965 |
| 150 | 1 | short | warm | 1; 1.152 / 2.583 / 3.736 | 4; 4.922 / 17.698 / 22.620 | 4; 2.913 / 4.689 / 7.602 |
| 150 | 1 | long | cold | 1; 1.527 / 3.367 / 4.894 | 4; 6.588 / 16.872 / 23.459 | 4; 7.571 / 46.123 / 53.695 |
| 150 | 1 | long | warm | 1; 1.178 / 2.496 / 3.673 | 4; 6.147 / 17.350 / 23.498 | 4; 7.172 / 5.005 / 12.178 |
| 150 | 5 | short | cold | 1; 1.813 / 3.630 / 5.443 | 4; 5.815 / 16.847 / 22.662 | 4; 5.768 / 5.012 / 10.780 |
| 150 | 5 | short | warm | 1; 1.390 / 2.673 / 4.063 | 4; 5.157 / 17.023 / 22.180 | 4; 5.212 / 4.864 / 10.076 |
| 150 | 5 | long | cold | 1; 1.819 / 3.614 / 5.434 | 4; 6.984 / 17.404 / 24.387 | 4; 25.534 / 5.492 / 31.026 |
| 150 | 5 | long | warm | 1; 1.377 / 2.965 / 4.342 | 4; 6.098 / 17.670 / 23.768 | 4; 24.471 / 5.530 / 30.001 |
| 150 | 20 | short | cold | 1; 2.635 / 4.034 / 6.670 | 4; 5.717 / 17.163 / 22.880 | 4; 13.929 / 6.076 / 20.004 |
| 150 | 20 | short | warm | 1; 2.142 / 3.840 / 5.982 | 4; 4.917 / 17.073 / 21.990 | 4; 13.389 / 5.748 / 19.137 |
| 150 | 20 | long | cold | 1; 2.678 / 4.133 / 6.811 | 4; 6.820 / 16.661 / 23.481 | 4; 105.208 / 7.968 / 113.176 |
| 150 | 20 | long | warm | 1; 2.422 / 3.530 / 5.952 | 4; 6.239 / 17.435 / 23.674 | 4; 105.783 / 8.486 / 114.269 |

At150students/20classes/longhistory, cold list/roster/matrix measured6.811/23.481/113.176ms versus baseline93.820/830.894/218.249ms. These are single observations, not statistically established latency improvements. Deterministic query growth is eliminated within measured fixture sizes. Candidate matrix aggregates the full joined dataset in one SELECT; further capacity/index decisions remain outside scope. No production/load claim.

Final named8652480 Teacher verification36862766356 passes both jobs:273backend tests zero skips, all144measurements1/4/4 and two real-browser F1 cases. Final measurement archive11162666520 SHA256 `fc15b3d154899b48370e7d215b21fa7dad19f292a6411c9175f787a17034f191`; JSON SHA256 `df6ea8a5517213a70de7c21b99757a127cc8fac06759ebdb9099f55576d9a692`. Exact source was independently accepted by PM/CTO/QA. Browser respects existing200ms minimum real answer interval and asserts accepted receipts; no runtime guard/clock was weakened. F2 case remains intentionally reserved for its owning branch.


## F2 integrated final candidate — executed

Named exact source `3ee301a6bfe6c401da931da001a613c8a5d1c68d`,
[Teacher verification36864981450](https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981450),
PostgreSQL16.15/Redis7.4.11/Python3.12. Both jobs SUCCESS: **304backend tests, zero
failures/errors/skips** and **three built-SPA realAPI Chromium cases**. Assignment
replacement, actual two-connection lock waiting with ATOMIC_REQUESTS disabled,
rollback after M2M change, available divergent primary-routing tests and exact
populated history/student-access preservation all execute.

Raw measurement ZIP artifact11163184894, retained until2026-10-31; SHA256
`3a4ce0d7439e0b8d0daea0fc9a15b3b80e31c608a5f29247d73cc72e57b56c3e`.
Extracted JSON SHA256
`f3137acd16fc23db714e1d0263fb38e5900a610908c2432ee6f29a180528a0fc`.
JUnit artifact11163460373 ZIP SHA256
`2a57efbd53e1ea441a6a689507215c5ea4a588bf14e8fc6e0445ded7b650135f`, XML SHA256
`cdb2282733070c46e5c3edf0142bee46eb0f155d2521988f3202719ca2b5bcef`.
All three reviewers independently downloaded/inspected final artifacts and browser
logs; final acceptance is in `docs/reviews/batch-level-assignment-final-2026-10-01.md`.

All24fixtures/144requests have correct returned values and **list2 / roster4 /
matrix4** data SELECTs, separately **one JWT auth SELECT and two savepoint queries**.
One additive batched canonical assignment prefetch raises F1 list1 to the signed
integrated budget2. Roster/matrix remain fixed. Same cell convention and fixture/
cache/measurement limitations as baseline.

| Active students | Classes | History | Cache | List: data; ms | Roster: data; ms | Matrix: data; ms |
|---:|---:|---|---|---|---|---|
| 5 | 1 | short | cold | 2; 2.917 / 11.227 / 14.144 | 4; 4.398 / 7.634 / 12.031 | 4; 5.154 / 6.480 / 11.634 |
| 5 | 1 | short | warm | 2; 1.675 / 4.293 / 5.968 | 4; 2.342 / 5.844 / 8.186 | 4; 2.675 / 5.332 / 8.007 |
| 5 | 1 | long | cold | 2; 1.784 / 4.852 / 6.636 | 4; 2.555 / 5.399 / 7.954 | 4; 2.808 / 5.401 / 8.209 |
| 5 | 1 | long | warm | 2; 1.463 / 3.927 / 5.390 | 4; 2.195 / 5.021 / 7.216 | 4; 2.538 / 5.193 / 7.732 |
| 5 | 5 | short | cold | 2; 2.175 / 5.165 / 7.340 | 4; 2.652 / 5.410 / 8.062 | 4; 2.996 / 5.736 / 8.733 |
| 5 | 5 | short | warm | 2; 1.639 / 4.390 / 6.029 | 4; 2.306 / 5.069 / 7.375 | 4; 2.637 / 5.607 / 8.244 |
| 5 | 5 | long | cold | 2; 2.032 / 5.142 / 7.175 | 4; 2.695 / 5.368 / 8.063 | 4; 3.448 / 6.494 / 9.942 |
| 5 | 5 | long | warm | 2; 1.619 / 4.831 / 6.450 | 4; 2.215 / 5.659 / 7.875 | 4; 3.190 / 5.986 / 9.175 |
| 5 | 20 | short | cold | 2; 2.251 / 6.142 / 8.393 | 4; 2.660 / 5.271 / 7.931 | 4; 3.520 / 6.279 / 9.799 |
| 5 | 20 | short | warm | 2; 1.782 / 5.629 / 7.410 | 4; 2.194 / 5.179 / 7.373 | 4; 3.035 / 6.472 / 9.507 |
| 5 | 20 | long | cold | 2; 2.298 / 6.467 / 8.765 | 4; 2.807 / 5.302 / 8.109 | 4; 5.802 / 7.950 / 13.752 |
| 5 | 20 | long | warm | 2; 1.789 / 5.682 / 7.471 | 4; 2.381 / 5.241 / 7.622 | 4; 5.557 / 8.332 / 13.889 |
| 10 | 1 | short | cold | 2; 2.309 / 4.548 / 6.857 | 4; 3.089 / 5.968 / 9.057 | 4; 2.982 / 5.107 / 8.089 |
| 10 | 1 | short | warm | 2; 1.687 / 3.938 / 5.625 | 4; 2.495 / 5.667 / 8.162 | 4; 2.760 / 5.267 / 8.027 |
| 10 | 1 | long | cold | 2; 1.855 / 4.932 / 6.787 | 4; 2.671 / 5.910 / 8.580 | 4; 3.079 / 5.312 / 8.391 |
| 10 | 1 | long | warm | 2; 1.626 / 4.056 / 5.682 | 4; 2.308 / 5.730 / 8.038 | 4; 2.669 / 5.301 / 7.971 |
| 10 | 5 | short | cold | 2; 2.164 / 5.217 / 7.381 | 4; 2.761 / 5.709 / 8.470 | 4; 2.969 / 5.802 / 8.771 |
| 10 | 5 | short | warm | 2; 1.754 / 4.846 / 6.601 | 4; 2.466 / 5.949 / 8.415 | 4; 2.860 / 5.859 / 8.720 |
| 10 | 5 | long | cold | 2; 1.965 / 5.289 / 7.255 | 4; 2.922 / 5.459 / 8.381 | 4; 4.357 / 6.124 / 10.481 |
| 10 | 5 | long | warm | 2; 1.557 / 4.487 / 6.044 | 4; 2.489 / 5.895 / 8.384 | 4; 3.873 / 5.907 / 9.780 |
| 10 | 20 | short | cold | 2; 2.513 / 6.499 / 9.012 | 4; 2.978 / 5.810 / 8.788 | 4; 3.715 / 6.258 / 9.973 |
| 10 | 20 | short | warm | 2; 2.015 / 5.737 / 7.752 | 4; 2.582 / 5.562 / 8.144 | 4; 3.512 / 6.936 / 10.449 |
| 10 | 20 | long | cold | 2; 2.321 / 6.645 / 8.966 | 4; 2.844 / 5.784 / 8.628 | 4; 8.127 / 8.426 / 16.553 |
| 10 | 20 | long | warm | 2; 1.934 / 5.588 / 7.522 | 4; 2.430 / 5.524 / 7.954 | 4; 8.096 / 9.955 / 18.051 |
| 50 | 1 | short | cold | 2; 2.169 / 4.827 / 6.995 | 4; 3.975 / 10.118 / 14.094 | 4; 2.911 / 5.745 / 8.656 |
| 50 | 1 | short | warm | 2; 1.591 / 4.094 / 5.686 | 4; 3.276 / 9.561 / 12.837 | 4; 2.766 / 5.379 / 8.145 |
| 50 | 1 | long | cold | 2; 1.987 / 4.757 / 6.744 | 4; 4.114 / 9.299 / 13.413 | 4; 4.546 / 5.515 / 10.061 |
| 50 | 1 | long | warm | 2; 1.588 / 3.974 / 5.562 | 4; 3.724 / 9.106 / 12.830 | 4; 4.161 / 5.769 / 9.931 |
| 50 | 5 | short | cold | 2; 2.413 / 5.238 / 7.652 | 4; 3.811 / 9.287 / 13.098 | 4; 3.992 / 5.424 / 9.417 |
| 50 | 5 | short | warm | 2; 1.860 / 4.773 / 6.633 | 4; 3.302 / 9.256 / 12.558 | 4; 3.394 / 5.054 / 8.447 |
| 50 | 5 | long | cold | 2; 2.141 / 4.834 / 6.976 | 4; 4.044 / 8.835 / 12.879 | 4; 10.320 / 6.986 / 17.305 |
| 50 | 5 | long | warm | 2; 1.711 / 4.348 / 6.060 | 4; 3.318 / 9.120 / 12.438 | 4; 10.500 / 7.251 / 17.751 |
| 50 | 20 | short | cold | 2; 2.849 / 6.868 / 9.717 | 4; 3.606 / 9.318 / 12.923 | 4; 6.395 / 6.623 / 13.017 |
| 50 | 20 | short | warm | 2; 2.092 / 5.804 / 7.897 | 4; 3.278 / 9.707 / 12.985 | 4; 6.290 / 7.106 / 13.396 |
| 50 | 20 | long | cold | 2; 2.670 / 6.265 / 8.935 | 4; 4.161 / 8.821 / 12.982 | 4; 32.628 / 10.259 / 42.887 |
| 50 | 20 | long | warm | 2; 2.258 / 5.642 / 7.900 | 4; 3.762 / 9.539 / 13.301 | 4; 32.649 / 9.494 / 42.142 |
| 150 | 1 | short | cold | 2; 2.308 / 4.528 / 6.836 | 4; 6.160 / 18.539 / 24.699 | 4; 3.777 / 5.696 / 9.473 |
| 150 | 1 | short | warm | 2; 1.635 / 4.004 / 5.638 | 4; 5.387 / 18.851 / 24.238 | 4; 3.337 / 5.649 / 8.986 |
| 150 | 1 | long | cold | 2; 2.183 / 4.481 / 6.664 | 4; 6.823 / 17.574 / 24.397 | 4; 7.817 / 5.541 / 13.358 |
| 150 | 1 | long | warm | 2; 1.617 / 4.047 / 5.664 | 4; 6.769 / 73.312 / 80.081 | 4; 7.318 / 5.492 / 12.810 |
| 150 | 5 | short | cold | 2; 2.626 / 5.257 / 7.883 | 4; 6.070 / 18.229 / 24.299 | 4; 5.891 / 5.508 / 11.399 |
| 150 | 5 | short | warm | 2; 2.041 / 4.674 / 6.716 | 4; 5.641 / 19.940 / 25.581 | 4; 5.893 / 5.692 / 11.585 |
| 150 | 5 | long | cold | 2; 2.507 / 4.835 / 7.343 | 4; 7.351 / 17.595 / 24.946 | 4; 26.891 / 6.717 / 33.609 |
| 150 | 5 | long | warm | 2; 2.143 / 4.118 / 6.261 | 4; 6.516 / 19.090 / 25.606 | 4; 26.200 / 6.939 / 33.139 |
| 150 | 20 | short | cold | 2; 3.416 / 6.070 / 9.486 | 4; 6.909 / 58.318 / 65.228 | 4; 14.285 / 6.277 / 20.562 |
| 150 | 20 | short | warm | 2; 2.756 / 5.419 / 8.175 | 4; 5.112 / 17.628 / 22.740 | 4; 14.227 / 6.993 / 21.220 |
| 150 | 20 | long | cold | 2; 3.406 / 6.098 / 9.504 | 4; 6.785 / 17.516 / 24.301 | 4; 113.765 / 8.952 / 122.716 |
| 150 | 20 | long | warm | 2; 2.877 / 5.543 / 8.421 | 4; 6.550 / 19.743 / 26.293 | 4; 111.416 / 8.673 / 120.089 |

At150active students/20classes/longhistory, analyzed cold SELECT plans return20
class aggregates plus60assigned-level rows; roster reads150active profiles and
150grouped completion/accuracy rows; matrix returns20class rows and560grouped
lesson/kind/class completion rows. These are bounded grouped reads with actual
active denominators and primary routing, not per-student/class query growth.
No new index/capacity claim follows from one timing sample.

Normal CI36864981375 passes backend/context/frontend/build with **136Vitest** tests.
It checks out generated PR merge29b69789c71c47105446bd0da8a3367804ccb723; the
specialized runtime jobs above explicitly check out exact3ee. The browser uses
real PBKDF2 login and no MSW: student finalization/Refresh, same-SPA teacher switch/
foreign denial, owner assignment Save/reload/report add-remove/history preservation.
The earlier F2 candidates are not substituted for final exact-source execution.
Controlled divergent aliases simulate lag, not streaming replication; single
observations/overlapping synthetic rosters/rolled-back measurement transactions/
Redis-only cold cache do not establish production load, statistical latency
improvement or AWS sizing. Human integration-revision CI/live evidence remain.
