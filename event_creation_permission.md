## **Refined Privacy Model (Simple & Clear)**

### **Connection/Group Tiers**

- **Private:**  
  - Connection/group sees nothing on your calendar by default.
- **Busy Only:**  
  - Connection/group sees only free/busy blocks (no event details).
- **Details:**  
  - Connection/group sees all event details, except for events explicitly marked as Private.

### **Event-Level Privacy**

- **Private Event:**  

  - Hides all details from everyone, regardless of their connection/group tier.
  - **Exception:** If a person or group is explicitly added as a participant or EventShare subject for that event, they can see the event details.
- **Event Sharing:**  
  - It should be possible to explicitly allow certain people or groups to see a Private event, regardless of their connection tier.

### **No Least Privilege Rule**

- **No automatic “most restrictive” logic.**
- **Explicit event privacy always wins:**  
  - If an event is marked Private, it is hidden from everyone except those explicitly allowed for that event.

### **No “Public” or “Visible”**
- All privacy is relationship/group-based, with event-level overrides.

---

## **How This Works in Practice**

- **Default:**  
  - Your calendar is shown to others based on their connection/group tier (Private, Busy Only, Details).
- **Private Event:**  
  - Even if someone is in your “Details” tier, they cannot see a Private event unless you explicitly add them to that event.
- **Explicit Sharing:**  
  - You can add people/groups to a Private event, and they will see the event details regardless of their connection tier.

---

## **Implementation Plan (High-Level)**

1. **Remove “public” and “visible” event privacy options.**
2. **Store connection/group tier for each relationship/group.**
3. **Event creation/edit UI:**
   - Allow marking an event as “Private.”
   - Allow adding explicit people/groups to a Private event.
4. **Event visibility logic:**
   - If event is Private, only show to explicit participants/EventShare subjects.
   - Otherwise, show based on connection/group tier.
5. **Backend/API:**
   - Enforce these rules when returning events.

---

## **Example Logic (Pseudocode)**

```js
function canViewEvent(user, event, owner) {
  if (user.id === owner.id) return 'details'; // Owner sees all
  if (event.participants.includes(user.id) || event.eventShares.includes(user.id)) return 'details';

  if (event.privacy === 'private') {
    return 'none'; // Only explicit participants/EventShare subjects see details (handled above)
  }

  const tier = getConnectionTier(user, owner); // 'private', 'busy_only', 'details'
  if (tier === 'private') return 'none';
  if (tier === 'busy_only') return 'busy_only';
  if (tier === 'details') return 'details';
}
```

---
