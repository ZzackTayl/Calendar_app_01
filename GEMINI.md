# Dependency Upgrade Guidance

- Before raising version constraints, check `flutter pub outdated` and verify that SDK-pinned packages (`flutter_test`, `integration_test`) and any transitive pins (e.g., `encrypt` → `pointycastle`) support the desired versions. If they do not, leave the existing constraint, note the blocker, and retry after upstream releases loosen their pins.
