import os
for fname in ["test_results.txt", "test_results_utf8.txt"]:
    try:
        os.remove(fname)
        print(f"Deleted: {fname}")
    except FileNotFoundError:
        print(f"Not found: {fname}")
