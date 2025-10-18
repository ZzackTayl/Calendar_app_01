# Dependency Upgrade Guidance

- Always audit pinned dependencies via `flutter pub outdated` before modifying version constraints. Only bump a package once its required ecosystem (SDK packages, transitive dependencies, or encrypt/pointycastle pairs) accepts the newer release; otherwise keep the current version and log the incompatibility for future review.
