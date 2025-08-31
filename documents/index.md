# Caiz.devについて

## 概要

Caiz.devは、NodeBBをベースにしたエンジニア向けコミュニティサイトです。

## サイトのURL

- 本番
  https://caiz.dev
- 開発
  http://caiz.dev

## 特徴

- Caiz.devは複数のコミュニティを一元管理します。
  - 例： https://caiz.dev/devrel -> DevRelに関するコミュニティ
  - 例： https://caiz.dev/golang -> Go言語に関するコミュニティ
- ユーザーは自由にコミュニティを作成できます。作成したユーザーは、そのコミュニティにおける管理者となります。
- ユーザーは複数のコミュニティに参加（フォロー）できます。
- ユーザーの権限はコミュニティによって異なります。

## アーキテクチャ

- 認証はGitHub/Google認証のみとします。

## 仕組み

- NodeBBのルートカテゴリーがコミュニティに相当します。
- サブカテゴリーがコミュニティのカテゴリーに相当します。
- ユーザー情報は全体で共通です。

## URL

ここでは、例として `EXAMPLE` というコミュニティがあると仮定します。

- コミュニティ一覧
  https://caiz.dev/communities
- コミュニティのホーム（カテゴリー一覧）
  https://caiz.dev/{EXAMPLE}
- コミュニティのスレッド一覧
  http://caiz.test/{EXAMPLE}/{CATEGORY_ID}-{CATEGORY_NAME}
- コミュニティのスレッド
  http://caiz.test/{EXAMPLE}/thread/{THREAD_ID}
- コミュニティのユーザー
  http://caiz.test/u/USER_ID
