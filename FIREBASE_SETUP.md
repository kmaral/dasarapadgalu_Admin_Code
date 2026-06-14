# Firebase Firestore Security Rules Setup

## Important: Enable Write Permissions

Your Firebase Firestore Manager app is currently **READ-ONLY** because the default Firebase security rules deny write operations. To enable full CRUD functionality (Create, Update, Delete, and Bulk Upload), you need to update your Firestore security rules.

## Steps to Update Security Rules:

### 1. Open Firebase Console
Go to [Firebase Console](https://console.firebase.google.com/)

### 2. Select Your Project
Select project: **haribhajane-eb8b5**

### 3. Navigate to Firestore Rules
- In the left sidebar, click on **Firestore Database**
- Click on the **Rules** tab

### 4. Update the Rules
Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 5. Publish the Rules
Click the **Publish** button to deploy the new rules.

## ⚠️ Security Warning

The rules above allow **unrestricted read and write access** to your Firestore database. This is suitable for:
- Development and testing
- Internal tools with trusted users
- Apps behind a VPN or firewall

### For Production Applications, Consider:

#### Option 1: Add Authentication
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Option 2: Use App Check
Enable Firebase App Check to verify requests come from your app:
[App Check Documentation](https://firebase.google.com/docs/app-check)

#### Option 3: Backend-Only Access
Move write operations to a backend service using Firebase Admin SDK with service account credentials.

## Verify It Works

After updating the rules:
1. Open your app: https://collection-hub-97.preview.emergentagent.com
2. Try adding a new document
3. Try editing an existing document
4. Try deleting a document
5. Try bulk uploading a CSV/JSON file

All operations should now work successfully with toast notifications confirming actions.

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify the rules were published correctly in Firebase Console
3. Try refreshing your app after updating rules
4. Check that your Firebase project ID matches: **haribhajane-eb8b5**
