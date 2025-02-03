# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [0.3.1] - 2025-02-03

### Changed
- Removed googleapis as a dependency to decrease build size, we only use it for the correct types.

## [0.3.1] - 2025-02-03

### Added
- Added proper licensing support with MIT license

## [0.3.0] - 2025-02-03

### Changed
- Rebuilt request generation logic for improved accuracy when converting HTML to Google Docs format
- Refactored internal block-to-request transformation for better fidelity