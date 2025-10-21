## **Verification, Corrections, and Additions for Guide "ONE"**

The original guide, "ONE," successfully captured core authorization concepts and best practices, largely verified by the sources. However, several areas required expansion, clarification based on modern practices (especially Zero-Trust and memory management), and integration of highly detailed security and testing information available in the sources.

### **Highlighted Corrections and Additions**

| **Section** | **Original Claim/Issue** | **Status/Correction/Addition** | **Source Support** |
| --- | --- | --- | --- |
| **1.1 Overview** | Authorization definition lacks a strong security principle reference. | **Addition:** Explicitly define Authorization within the context of the **Zero-Trust principle** ("never trust, always verify"). |     |
| --- | --- | --- | --- |
| **3.1 Token-Based** | Missing the mechanism for Refresh Token security. | **Addition:** Mandate **Refresh Token Rotation**, where the old token is invalidated when a new one is issued. Also, tokens should be bound to device identifiers or keys to detect compromise. |     |
| --- | --- | --- | --- |
| **3.3 OAuth/OIDC** | Mentioned avoiding WebViews, but needs clarification on Flutter tooling. | **Addition:** Reiterate the need to use platform-native browser flows (Chrome Custom Tabs/SFSafariViewController) and note that custom OAuth flows might require the flutter_web_auth_2 package. |     |
| --- | --- | --- | --- |
| **4.1 Secure Storage** | Missing key management principle. | **Addition:** Add the crucial best practice: **Never hard-code keys**. Also, mention that secure storage should be protected by hardware encryption (Keychain/Keystore). |     |
| --- | --- | --- | --- |
| **4.2 Token Refresh** | Missing network resilience mechanism for failure. | **Addition:** When refreshing fails, implement **exponential backoff** and abort after a configured number of attempts to prevent infinite loops. |     |
| --- | --- | --- | --- |
| **4.5 Biometric Auth** | Verified the use case but lacked technical context. | **Addition:** Specify that biometrics should leverage hardware-backed keys like the **iPhone Secure Enclave**. |     |
| --- | --- | --- | --- |
| **5.2 Network Failures** | Correctly identified Exponential Backoff but lacked specific Dart implementation context. | **Addition:** Clarify that 400-499 errors usually mean invalid credentials (force logout), while 500-599 errors may be transient (retry/backoff). |     |
| --- | --- | --- | --- |
| **5.4 Improper Caching** | Omitted one of the primary causes of state-related issues. | **Addition:** Link improper caching directly to **Memory Leaks** caused by undisposed controllers, streams, or timers, which retain memory references. |     |
| --- | --- | --- | --- |
| **6\. Testing Overview** | Testing definitions were slightly misaligned with explicit Flutter terminology. | **Clarification:** While "End-to-End Test" is a common term, Flutter explicitly refers to this comprehensive testing method as **Integration Testing** via the integration_test package. |     |
| --- | --- | --- | --- |
| **6\. Testing/Validation** | Missing critical debugging and compliance tools. | **Addition:** Include **Accessibility Testing** using the a11y scanner in DevTools and the AccessibilityScanner class for testing UI compliance. |     |
| --- | --- | --- | --- |
| **8\. JSON Schema** | Security transport section was too generic. | **Expansion:** Explicitly include **Certificate Pinning** as a core mechanism for enhanced security in transit. |     |
| --- | --- | --- | --- |

# **The Junior Developer's Guide to Authorization in Flutter (VERSION TWO)**

This guide is designed for Junior Developers starting their journey with Authorization in Flutter applications. It pulls together architectural best practices, security fundamentals, and essential code patterns.

## **1\. High-Level Overview**

### **What is Authorization?**

Authorization answers the question: **"What can this user do?"**. It is the process of defining and enforcing rules about which authenticated users (or services) are allowed to access specific resources, perform certain actions, or view particular data.

**Zero-Trust Principle in Authorization:** For modern mobile development, Authorization must be designed under the **Zero-Trust principle**. This means assuming the device, network, and app can be compromised and continuously validating every request. Therefore, **all authorization decisions must be made and verified on the backend**.

### **Authorization vs. Authentication**

While often discussed together, they are distinct processes:

- **Authentication (AuthN):** Verifies the user's identity ("Who are you?"). This typically involves username/password, social sign-in (Google/Apple), or biometric scans (Face ID, Fingerprint).
- **Authorization (AuthZ):** Determines the permissions granted to the _authenticated_ user ("What are you allowed to touch?"). This is handled by the backend, often using mechanisms like JWT scopes, roles, or database security rules.

### **Common Authorization Patterns in Mobile Apps**

| **Pattern** | **Description** | **Location of Enforcement** |
| --- | --- | --- |
| **Token-Based (JWT)** | A signed token (JSON Web Token) is received upon successful authentication. This token contains claims (e.g., user ID, roles, expiry time) which the client sends with every request, and the server validates them to grant access. | Client sends token, Server verifies token and grants/denies access. |
| --- | --- | --- |
| **ACL/RLS (Database Rules)** | Access Control Lists (ACLs) or Row Level Security (RLS) policies define permissions directly on the data resource itself (e.g., "Only the creator can read this document"). This is the recommended approach for defining security close to the data. | Database (e.g., Firebase Security Rules, Supabase RLS). |
| --- | --- | --- |
| **Role-Based Access Control (RBAC)** | Permissions are mapped to predefined roles (e.g., 'admin', 'user', 'moderator'). The user's token/session contains the role, which the server checks before fulfilling a request. | Server/Backend Logic (Cloud Functions, custom API). |
| --- | --- | --- |

## **2\. Use Cases & Decision Guidance**

| **Use Case / Scenario** | **Recommended Authorization Approach** | **Trade-Offs** | **When _Not_ to Use It** |
| --- | --- | --- | --- |
| **Single-User App (User's private data)** | **Database Rules (UID Matching)**: Use Firebase Security Rules or Supabase RLS to ensure a user's ID (request.auth.uid) matches the document's creator field. | Very fast development time; robust security enforcement defined near the data. | If the data needs complex visibility logic (e.g., sharing with partners) that database rules cannot express. |
| --- | --- | --- | --- |
| **Multi-Tenant App (Shared Resources)** | **Database Rules + Team Roles**: Use database rules tied to specific Role.team('') strings (e.g., in Appwrite) or **custom claims/group IDs in Firebase**. | Scalable for simple resource isolation; managed easily via BaaS console. | If you need dynamic, conditional authorization logic based on real-time factors outside the database structure. |
| --- | --- | --- | --- |
| **Role-Based Admin Panel (Hierarchical)** | **Serverless Functions + Custom Claims/Roles**: Client requests the function, the function verifies the user's high-level role (e.g., 'admin') using Admin SDK or custom claims, and performs the privileged action. | Offloads sensitive logic and API keys away from the client. Enforces the **"Principle of least privilege"** by limiting direct client actions. Functions are best practice for secure/critical operations. | If the permissions are simple and non-sensitive; introducing a serverless layer adds cost and complexity. |
| --- | --- | --- | --- |
| **Offline-First Apps (Local Caching)** | **Local Persistence + Backend Validation**: Allow read access to cached data (Hive, SQLite). **MANDATE** backend checks and **conflict resolution** upon reconnection and batch synchronization. | Offers a better user experience when offline. Requires robust conflict resolution logic (e.g., Last-Write-Wins). | If the data is highly sensitive (e.g., payments) and must be verified in real-time before use. |
| --- | --- | --- | --- |

## **3\. Architecture Options**

### **3.1 Token-Based (JWT)**

JSON Web Tokens (JWTs) are the industry standard for securing stateless API calls.

| **Feature** | **Details and Flutter Mapping** |
| --- | --- |
| **How it works** | The server issues a short-lived **Access Token** (JWT) and a long-lived **Refresh Token**. The Access Token is attached as a Bearer header for every API request. **Crucially, the refresh token must be rotated** upon use (a new refresh token is issued, invalidating the old one). |
| --- | --- |
| **Mapping to Flutter** | Use an HTTP interceptor (e.g., Dio or http_interceptor) to automatically attach the token to outgoing requests and handle 401 Unauthorized responses by triggering the refresh flow. The tokens must be stored using flutter_secure_storage. |
| --- | --- |
| **Pros** | **Stateless:** The server doesn't need to save session data, making scaling easier. **Interoperable:** Works universally with REST, GraphQL, and serverless functions. |
| --- | --- |
| **Cons** | Requires careful management of expiry times and refresh logic. If a refresh token is compromised, immediate rotation and server-side binding (e.g., to a device identifier) are needed. |
| --- | --- |
| **Example Flow** | 1\. User signs in. 2. Server returns JWT pair. 3. Client saves token securely. 4. Client makes API call with Authorization: Bearer &lt;JWT&gt;. 5. Server checks token's signature/expiry. |
| --- | --- |

### **3.2 Session-Based (BaaS/Custom Backend)**

Sessions rely on the backend tracking the active login state.

| **Feature** | **Details and Flutter Mapping** |
| --- | --- |
| **How it works** | Upon login, the server sets a session identifier (e.g., an opaque session key). BaaS solutions like Supabase provide a Session object derived from authentication state changes. |
| --- | --- |
| **Mapping to Flutter** | Supabase's onAuthChange stream provides the core authentication state. Flutter must handle session persistence, using secure local storage (e.g., custom implementation with flutter_secure_storage). |
| --- | --- |
| **Pros** | Simplifies state management when using a dedicated BaaS (e.g., Firebase Auth, Supabase). Provides persistent login state across app restarts. |
| --- | --- |
| **Cons** | Relies heavily on the specific BaaS SDK handling persistence correctly. Less flexible for arbitrary custom microservices architectures. |
| --- | --- |

### **3.3 OAuth2/OIDC Flows and Third-Party Providers**

OAuth 2.0 and OpenID Connect (OIDC) are protocols used for secure delegation and identity verification, commonly implemented for social logins.

| **Feature** | **Details and Flutter Mapping** |
| --- | --- |
| **How it works** | The user is redirected to the external provider (e.g., Google) to approve access, which then redirects back to the app with a token. |
| --- | --- |
| **Mapping to Flutter** | **AVOID USING WEBVIEWS**. WebViews are a security risk and can lead to app rejection by Apple and Google. Use platform-native browser flows instead: **Chrome Custom Tabs** (Android) and **SFSafariViewController** (iOS). For custom OAuth flows, dedicated packages like flutter_web_auth_2 may be necessary. |
| --- | --- |
| **Pros** | **Zero Password Risk:** You never handle user passwords. **UX:** Users prefer social login. |
| --- | --- |

### **3.4 Firebase Auth and Backend Integration**

Firebase Auth handles user management and provides the necessary credentials for authorization across other Firebase products.

- **Firebase Authentication:** Provides user management, token management (JWT ID Tokens), and integration with many providers (Google, Apple). Tokens are sent from the client and can be verified on the backend.
- **Authorization Integration:**
  - **Cloud Firestore/Realtime DB:** Firebase Security Rules use the authenticated user's Unique User ID (UID) (request.auth.uid) to control document-level read/write permissions. This is crucial for restricting data retrieval to the current user's documents.
  - **Cloud Functions:** The Flutter client sends its ID token, which the Cloud Function verifies to ensure the request is authenticated and authorized. Functions are used for critical operations that require securely hidden API keys and complex business logic.

## **4\. Step-by-Step Best Practices Checklist**

| **#** | **Best Practice & Rationale** | **Concise Dart/Flutter Code Example or Snippet** |
| --- | --- | --- |
| **1** | **Secure Storage & Key Management** **Rationale:** Long-lived tokens (refresh tokens, private encryption keys) must be stored in platform-backed secure storage (iOS Keychain, Android Keystore). **NEVER HARD-CODE KEYS**. | **Dart (Repository Layer)** dart import 'package:flutter_secure_storage/flutter_secure_storage.dart'; final storage = FlutterSecureStorage(); // Use secure storage to leverage hardware encryption await storage.write(key: 'refresh_token', value: refreshToken); // Ensure tokens are deleted on sign-out Future&lt;void&gt; signOut() async { await storage.deleteAll(); // Wipe all stored credentials } |
| --- | --- | --- |
| **2** | **Automate Token Refresh (with Retry)** **Rationale:** Access tokens are short-lived (minutes) for security. The refresh flow must automatically trigger upon a 401 error and retry the original request. Use **exponential backoff** (e.g., 1s, 2s, 4s delay) for transient network failures (5xx status codes). | **Dart (HTTP Interceptor - Pseudo-code)** dart Future&lt;ResponseData&gt; interceptResponse(ResponseData resp) async { if (resp.statusCode == 401) { // 401: Unauthorized. Attempt refresh/rotation final newToken = await repo.refreshAccessToken(); repo.saveAccessToken(newToken); // Retry the original request return await HttpClient().send(resp.request!); } return resp; } |
| --- | --- | --- |
| **3** | **Enforce Least Privilege & Scopes** **Rationale:** Adopt **Zero-Trust**. Only grant the absolute minimum permissions needed for a specific action (fine-grained scopes). This minimizes the "blast radius" if a credential is compromised. | **Server-Side (Conceptual)** dart // Server verifies: JWT Scope == 'user:read_profile' // If client requests a sensitive action (e.g., deletion), the // server must perform multi-factor checks |
| --- | --- | --- |
| **4** | **Mandatory Backend Checks (Zero Trust)** **Rationale:** Client-side UI logic (hiding buttons) is easily bypassed. All authorization decisions must be **re-validated on the backend** immediately before executing any sensitive operation. | **Firebase Security Rule Example** firestore rules service cloud.firestore { match /databases/{database}/documents { match /tasks/{taskId} { // Only allow writes if the user owns the task (UID matching) allow write: if request.auth.uid == resource.data.creator; } } } |
| --- | --- | --- |
| **5** | **Biometric Step-Up Authentication** **Rationale:** For critical, sensitive actions (payments, account deletion), re-verify the user's identity using biometrics (Face ID/Fingerprint). This should leverage hardware-backed keys, such as the **iPhone Secure Enclave**. | **Dart (Critical Action Flow)** dart // Requires 'local_auth' package final bool authenticated = await LocalAuthentication().authenticate( localizedReason: 'Prove identity for sensitive action.', ); if (authenticated) { // Proceed with privileged action } |
| --- | --- | --- |

## **5\. Common Issues & Troubleshooting**

| **Issue** | **Symptoms** | **Root Causes** | **Step-by-Step Fixes** |
| --- | --- | --- | --- |
| **Token Expiry / Rotation Failure** | Frequent 401 Unauthorized API errors. Users are prematurely logged out. | Access token lifetime is too short, and the automatic refresh flow is missing, failing, or slow. Refresh tokens were not rotated, leading to revocation. | **1\. Implement Interceptor:** Use an HTTP client interceptor to detect 401 responses. **2\. Trigger Refresh & Rotation:** Execute the refresh token exchange and ensure the old refresh token is immediately invalidated. **3\. Retry:** Automatically re-send the original failed request using the new access token. |
| --- | --- | --- | --- |
| **Network Failures (Transient)** | Requests fail with timeout or connection errors. | Intermittent connectivity, or the server is temporarily overloaded (5xx status codes). | **1\. Identify Error Type:** Categorize 5xx errors as transient. **2\. Retry Logic:** Implement **exponential backoff** (delay should increase after each failure: 1s, 2s, 4s) and limit the maximum number of retries. **3\. Handle State:** Show cached content and clearly indicate the connection status to the user. |
| --- | --- | --- | --- |
| **Permission Leaks (Client-side bypass)** | A non-admin user performs an admin action by manually crafting an API request. | Failure to enforce the authorization rule on the **backend** (e.g., using allow read: true or skipping server-side validation). | **1\. Zero Trust:** Assume the client is compromised. **2\. Backend Validation:** Every sensitive action must be validated by security rules (RLS) or custom backend logic (Cloud Functions). **3\. Validate Input:** Sanitize and validate all user inputs on the server-side to prevent injection attacks. |
| --- | --- | --- | --- |
| **Improper Caching & Memory Leaks** | User views stale/incorrect data after a permission change (UI reflects old role). App memory usage grows over time. | User data or roles are cached locally and not properly invalidated after an authorization state change. Memory leaks caused by undisposed resources (streams, controllers, timers) that retain references. | **1\. Live Listeners:** Use reactive streams (like Firebase idTokenChanges or state management providers) to listen for token/role changes. **2\. Clean Up:** Always override dispose in StatefulWidget to clear resources, controllers, and streams to prevent memory leaks. **3\. Invalidate Cache:** When a security event occurs, clear relevant local persistence layers. |
| --- | --- | --- | --- |
| **Clock Skew** | JWTs appear expired immediately after being issued, causing sudden 401 errors across distributed systems. | The difference in clock time between the client device, the authorization server that issued the token, and the resource server that validated the token. | **1\. Server Sync:** Ensure backend and authorization servers are tightly time-synchronized (NTP). **2\. Tolerance:** Implement a slight tolerance window (e.g., 60 seconds) for nbf (not before) and exp (expiry) claims validation on the resource server. |
| --- | --- | --- | --- |

## **6\. Testing & Validation**

Intentional architecture simplifies testing by allowing easy replacement of external dependencies with mocks.

### **Testing Suggestions**

- **Unit Tests:** Verify the core business logic of a single function, method, or class. Aim to test the **pure Dart logic** (Domain/Repository layer implementation) independently of the framework or network calls.
  - _Test Objective:_ Does AuthRepository.signIn() correctly parse a successful response or throw an expected domain error?
- **Widget Tests (Component Tests):** Ensure UI appearance and functionality of a single widget. Verify that the UI correctly reflects the user's authorization state (e.g., hiding the 'Admin Dashboard' button if user.role is not 'admin').
  - _Test Objective:_ When the AuthService emits a non-admin user, is the AdminButton widget not present?
- **Integration Tests (End-to-End Tests):** Validate the overall functionality of the entire application, ensuring all components interact seamlessly (UI, logic, real backend/database) and assessing performance. These tests typically run on real or emulated devices.
  - _Test Objective:_ Sign in a standard user, attempt to perform a privileged write operation, and verify the operation fails with a 403 Forbidden error due to Firebase Security Rules enforcement.

### **Tools**

- **Mocking Libraries:** Use **Mockito** or **Mocktail** to simulate external dependencies (like the Firebase database or API service) during unit and widget testing.
- **Backend Emulation:** **Firebase Emulator Suite** is essential for developing and testing Firebase Security Rules and Cloud Functions locally before deployment.
- **Profiling Tools:** **Flutter DevTools** is the primary tool to track memory usage, CPU consumption, and performance bottlenecks, which helps diagnose issues like memory leaks caused by improper disposal.
- **UI/Security Validation:**
  - **Accessibility Scanner (DevTools/Code):** Enable the a11y scanner in Flutter DevTools to audit contrast and semantics visually. For automated testing, use the AccessibilityScanner class within widget tests.
  - **Golden Tests:** Use snapshot testing (Golden Tests) for **pixel-critical UI** verification against visual regressions.

### **Example Test Case (Unit Test using Mocking)**

This example illustrates isolating the Repository layer logic using Mockito.

// 1. Define the Mock class

import 'package:mockito/mockito.dart';

// Assume Mockito is used

class MockAuthRemoteDataSource extends Mock implements AuthRemoteDataSource {}

// 2. Write the Test

void main() {

late AuthRepositoryImpl repository;

late MockAuthRemoteDataSource mockSource;

setUp(() {

mockSource = MockAuthRemoteDataSource();

// Inject the mock dependency into the repository implementation

repository = AuthRepositoryImpl(remoteDataSource: mockSource);

});

test('should return success string on successful sign in', () async {

// Arrange: Stub the mock to return deterministic results

when(mockSource.signIn('<test@user.com>', 'password123'))

.thenAnswer((\_) async => 'Success token');

// Act: Call the function we are testing

final result = await repository.signIn('<test@user.com>', 'password123');

// Assert: Verify the expected outcome and verification of method call

expect(result, 'Success token');

verify(mockSource.signIn('<test@user.com>', 'password123')).called(1);

});

}

## **7\. Developer-Facing Cheat Sheets**

### **API Endpoints (Typical Custom Backend)**

| **Action** | **Endpoint** | **Method** | **Purpose** |
| --- | --- | --- | --- |
| **Login/AuthN** | /api/v1/auth/login | POST | Exchange credentials for Access Token/Refresh Token. |
| --- | --- | --- | --- |
| **Token Refresh** | /api/v1/auth/refresh | POST | Exchange expired Refresh Token for a new Access Token pair. |
| --- | --- | --- | --- |
| **Authorized Read** | /api/v1/users/{id}/data | GET | Retrieve protected user data. **Requires JWT Header.** |
| --- | --- | --- | --- |
| **Admin Action** | /api/v1/admin/purge_cache | POST | Critical operation. **Requires JWT + Admin Role/Scope (Must be Serverless or heavily validated)**. |
| --- | --- | --- | --- |

### **HTTP Headers**

The client is responsible for sending the JWT in the Authorization header for all protected endpoints.

| **Header Key** | **Example Value** | **Rationale** |
| --- | --- | --- |
| **Authorization** | Bearer eyJhbGciOiJIUzI1NiI... | **MANDATORY** Access Token for every authenticated request. |
| --- | --- | --- |
| **Content-Type** | application/json | Standard for sending JSON payloads. |
| --- | --- | --- |

### **Common Authorization/Authentication Error Codes**

| **Status Code** | **Meaning** | **Client Action Required** | **Backend Action Required** |
| --- | --- | --- | --- |
| **401 Unauthorized** | The token is missing, invalid, or expired. | If the access token expired, attempt to refresh using the refresh token (with exponential backoff). If refresh fails (e.g., 400-499 error), force redirect user to login screen. | Check token validation and signature. |
| --- | --- | --- | --- |
| **403 Forbidden** | The user is authenticated, but **lacks the necessary authorization/permissions** to access the resource. | Display an error message (e.g., "Access Denied"). Do **not** attempt token refresh. | Verify RLS/Security Rules or application-level role checks. |
| --- | --- | --- | --- |
| **429 Too Many Requests** | Rate limit exceeded (often for login or token refresh). | Implement exponential backoff retry strategy. | Review rate limiting policies. |
| --- | --- | --- | --- |

### **Sample Dart Code for an Authorized Request**

This code snippet shows how the token is used for secured transmission.

Future&lt;void&gt; fetchUserData(String userId) async {

// 1. Retrieve the Access Token from secure storage

final token = await FlutterSecureStorage().read(key: 'access_token');

if (token == null) throw Exception('User not logged in');

final url = Uri.parse('/api/v1/users/\$userId/data');

// 2. Attach the token as a Bearer header

final response = await http.get(

url,

headers: {

'Authorization': 'Bearer \$token',

'Content-Type': 'application/json',

},

);

if (response.statusCode == 200) {

// Success: Authorization checks passed on backend

print('Data received: \${response.body}');

} else if (response.statusCode == 401) {

// Failure: Token is expired/invalid (trigger refresh flow here)

throw Exception('Token expired. Refresh required.');

} else if (response.statusCode == 403) {

// Failure: User does not have permission

throw Exception('Permission denied.');

} else {

// Handle other errors, potentially transient 5xx codes

}

}

## **8\. AI-Consumable Summary (JSON Schema)**

****{

"concept": "Authorization_Flutter_Mobile",

"definition": "Determining an authenticated user's permissions (AuthZ), distinct from verifying identity (AuthN). Enforced primarily on the backend (Zero Trust principle).",

"architectures": \[

{

"name": "Token_Based_JWT",

"mechanism": "Short-lived Access Tokens in 'Authorization: Bearer' header. Requires Refresh Token Rotation.",

"flutter_integration": "flutter_secure_storage for Refresh Token; HTTP Interceptors handle 401 and refresh.",

"best_practice": "Tokens must be short-lived; least privilege scopes required."

},

{

"name": "BaaS_DB_Rules",

"mechanism": "Row Level Security (RLS) or Firebase Security Rules, enforced by UID matching.",

"flutter_integration": "Client uses UID from Firebase/Supabase SDK; rules use \`request.auth.uid\` for enforcement.",

"focus": "Document/row-level access control."

},

{

"name": "Serverless_Gateway",

"mechanism": "Cloud Functions execute privileged logic, securely hiding API keys.",

"flutter_integration": "Client calls HTTPS Callable function; necessary for critical, sensitive operations.",

"use_case": "Complex, conditional authorization (e.g., role-based access, payment validation)."

}

\],

"security_practices": \[

{

"key": "Secure_Storage",

"tool": "flutter_secure_storage",

"platform_native": "iOS Keychain, Android Keystore (hardware-backed encryption).",

"data_stored": \["Refresh Tokens", "Private Encryption Keys"\],

"governance": "Never hard-code keys; purge on logout."

},

{

"key": "Secure_Transport",

"method": "HTTPS/TLS mandatory.",

"enhancement": "Certificate Pinning (for critical APIs and MITM defense)."

}

\],

"error_handling": {

"401_action": "Attempt token refresh with exponential backoff.",

"403_action": "Log permission failure; DO NOT refresh token.",

"common_issues": \["Memory Leaks (undisposed controllers/streams)", "Client-side bypass (must enforce server-side Zero Trust)"\]

},

"testing_strategy": {

"types": \["Unit (Core Logic)", "Widget (UI State/Interaction)", "Integration (E2E/Backend Validation)"\],

"tools": \["Mockito/Mocktail", "Firebase Emulator Suite", "Flutter DevTools (Memory/Performance View)"\],

"validation": "Accessibility Testing (DevTools a11y scanner, AccessibilityScanner class)."

}

}
