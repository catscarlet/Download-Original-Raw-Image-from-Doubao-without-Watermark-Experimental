# CHANGELOG

(from new to old)

**Notice doubao.com is using *canary release* so this new release will not work for old web version. If your web version is not changed, use the old release instead.**

## 0.1.1

- Fix fails when there is failed generating in conversation.
- Rewrite Selector
- Remove obsoleted code

## 0.1.0

- **Support downloading video without watermark Now!**
- **Update image download logic to match doubao update.**
- Minor bug fixes.

Known issues:

- There is a strange bug that the downloading may not work but reloading the page may fix it.
- Also this version may have strange conflicts to other userscript, like <https://greasyfork.org/scripts/527890>. If you having issue, try only enable only one at a time.

## 0.0.5

The web version of doubao has changed its structure and logic.

**Notice doubao.com is using *canary release* so this new release will not work for old web version. If your web version is not changed, use the old release instead.**

- Update querySelector to match doubao update.

## 0.0.4

- **Rewrite function createModifiedXHR()** and match up doubao update.
- Change class-flag to make compatible with other userscript
- Increase the threshold from 300 to 750 to reduce system load.
- New Feature: centerImageEditorButtonPanel
- Fix wrong English name in title
- Minor bug fixes.

## 0.0.3

- Update image url to match doubao update

## 0.0.2

- Fix a global variable leak
- Update querySelector to match doubao update
- Fix visual error when downloading while moving mouse out and over again

## 0.0.1

- Initial commit.
