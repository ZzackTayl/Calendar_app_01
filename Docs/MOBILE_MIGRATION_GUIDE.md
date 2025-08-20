# Mobile Migration Guide: Web to iOS

## Introduction

This guide outlines the process of migrating your Next.js web application to a native iOS application using React Native and Expo. The existing `PolyHarmony` directory in your project is a great starting point, and this guide will build upon that foundation.

The process is not a direct code translation but rather a re-implementation of the user interface and client-side logic in React Native, while reusing your existing Supabase backend, database schema, and business logic.

## 1. Development Environment Setup

To build and run a React Native app, you'll need the following installed on your machine:

*   **Node.js:** Use a version manager like `nvm` to install the latest LTS version.
*   **Watchman:** A file-watching service from Facebook. Install it with Homebrew: `brew install watchman`
*   **Xcode:** Install Xcode from the Mac App Store. This will install the necessary iOS simulators and command-line tools.
*   **Expo CLI:** Install the Expo CLI globally: `npm install -g expo-cli`

## 2. Project Structure: Monorepo vs. Separate Projects

You currently have two separate projects. For better code sharing and maintainability, I recommend migrating to a monorepo structure using **npm workspaces**.

**Benefits of a Monorepo:**

*   **Shared Code:** Easily share code between your web and mobile apps (e.g., Supabase client, validation schemas, type definitions).
*   **Simplified Dependency Management:** Manage dependencies for all your projects in one place.
*   **Atomic Commits:** Make changes to both web and mobile in a single commit.

**How to set up a monorepo:**

1.  Create a `packages` directory in the root of your project.
2.  Move the `app`, `components`, `hooks`, `lib`, `public`, and other web-specific directories into a new `packages/web` directory.
3.  Move the contents of the `PolyHarmony` directory into a new `packages/mobile` directory.
4.  Create a `packages/shared` directory for code that will be used by both web and mobile.
5.  Update your root `package.json` to define the workspaces.

## 3. Code Sharing Strategy

With a monorepo, you can create a `shared` package for common code.

**What to share:**

*   **Supabase Client:** Create a single Supabase client instance in the `shared` package and import it into your web and mobile apps.
*   **Type Definitions:** Your `lib/supabase/types.ts` can be moved to the `shared` package.
*   **Validation Schemas:** If you are using a library like Zod for validation, you can share your schemas.
*   **API Calls:** Abstract your Supabase API calls into functions that can be shared.

## 4. UI Component Implementation

Your web app uses `radix-ui` and `shadcn/ui`, which are not compatible with React Native. You will need to rebuild your UI using React Native components.

**Recommended UI Libraries for React Native:**

*   **React Native Paper:** A popular and comprehensive UI library with a Material Design focus.
*   **Tamagui:** A newer library that offers a more "universal" approach, with some components that can be shared between web and mobile. This could be a good option if you want to unify your design system.

**Action:**

*   Choose a UI library and install it in your `packages/mobile` project.
*   Re-implement your components from the `components/ui` directory using the chosen library.

## 5. Authentication

The authentication flow in a mobile app is slightly different from a web app.

*   **Secure Storage:** On mobile, you need to use a secure storage solution to persist the user's session. `expo-secure-store` is a good choice and is already included in your `PolyHarmony/package.json`.
*   **Supabase Client:** Use the standard `@supabase/supabase-js` client for authentication. The `@supabase/auth-helpers-nextjs` library is for Next.js only.

**Action:**

*   Implement your sign-in, sign-up, and sign-out flows using the Supabase client and `expo-secure-store`.
*   Create an authentication context (similar to `lib/auth-context.tsx`) for your mobile app to manage the user's session.

## 6. Navigation

React Native does not have a built-in navigation system like Next.js. The most popular library for this is **React Navigation**.

**Action:**

*   Install React Navigation in your `packages/mobile` project.
*   Set up a navigation container and a stack navigator for your screens.
*   Re-create the navigation structure of your web app using the navigators provided by React Navigation.

## 7. Database Interaction

Your database schema (`database_schema.sql`) can be reused without any changes. You will interact with your Supabase database using the shared Supabase client.

**Action:**

*   Ensure your database queries are abstracted into the `packages/shared` directory so they can be used by both your web and mobile apps.

## 8. Potential Challenges and Final Words

*   **Platform-Specific Code:** You may need to write platform-specific code for some features (e.g., push notifications, access to native APIs). React Native provides mechanisms to handle this.
*   **Testing:** You will need to set up a separate testing environment for your mobile app using a library like React Native Testing Library.
*   **Deployment:** Deploying to the Apple App Store is a multi-step process that involves creating an Apple Developer account, creating provisioning profiles, and submitting your app for review through App Store Connect.

This migration is a significant undertaking, but by following this guide and leveraging the power of React Native and Expo, you can create a high-quality iOS app that complements your existing web application.
