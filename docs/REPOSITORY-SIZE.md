# Repository size policy

The current repository is large because it intentionally contains the complete site media, PDFs, BIM models and office documents required to reproduce the website. The first published snapshot is roughly 0.8 GB.

Do not rewrite shared Git history just to reduce the current size: that would invalidate clones and audit references. For new large binaries, prefer Git LFS or an approved artifact/object store and keep stable public download paths. Before any future history migration, create and verify a bare backup, announce a freeze, test a fresh clone and document old-to-new commit mapping.

Generated dependency folders, runtime data, local backups and build outputs remain ignored. `MANIFEST.csv` covers the intended worktree and is checked in CI.

