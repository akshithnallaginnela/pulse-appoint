# 🧪 Testing Guide - Pulse Appoint Enhancements

## Prerequisites
- MongoDB running
- Backend server started
- Frontend server started

---

## 🤖 Testing the Chatbot

### Test 1: Book an Appointment

1. **Open the application** in your browser
2. **Click the chatbot button** (bottom right)
3. **Type:** "I need a doctor"
4. **Follow the flow:**
   - Bot will ask for specialization or doctor name
   - Choose a doctor
   - Select a date (e.g., "tomorrow")
   - Pick a time slot
   - Provide reason (e.g., "regular checkup")
   - Confirm the booking

**Expected Result:** ✅ Appointment created in database with status "pending"

---

### Test 2: Cancel an Appointment

1. **Open chatbot**
2. **Type:** "Cancel my appointment"
3. **Follow the flow:**
   - Bot shows your appointments
   - Select one by number
   - Bot calculates refund amount
   - Confirm cancellation

**Expected Result:** ✅ Appointment status changed to "cancelled", refund calculated

**Refund Rules:**
- >24 hours before: 100% refund
- 2-24 hours before: 50% refund
- <2 hours before: No refund

---

### Test 3: Reschedule an Appointment

1. **Open chatbot**
2. **Type:** "Reschedule appointment"
3. **Follow the flow:**
   - Select appointment
   - Choose new date
   - Choose new time
   - Confirm

**Expected Result:** ✅ Appointment updated with new date/time

---

## 👨‍⚕️ Testing the Doctor Dashboard

### Setup: Create a Doctor Account

1. **Go to login page**
2. **Click "Doctor" tab**
3. **Fill in the registration form:**
   - Name, email, password
   - License number (e.g., "DOC12345")
   - Specialization (e.g., "Cardiologist")
   - Experience (e.g., "5")
   - Consultation fee (e.g., "500")
4. **Submit**

**Expected Result:** ✅ Redirected to `/doctor/dashboard`

---

### Test 4: View Dashboard

1. **Login as doctor**
2. **Check dashboard displays:**
   - Today's appointments count
   - Completed appointments
   - Earnings
   - List of today's appointments

**Expected Result:** ✅ Dashboard shows correct stats and appointments

---

### Test 5: Manage Appointments

1. **On dashboard, find a pending appointment**
2. **Click "Confirm"**
3. **Verify status changes to "confirmed"**
4. **Click "Complete"**
5. **Verify status changes to "completed"**

**Expected Result:** ✅ Status updates work correctly

---

### Test 6: View All Appointments

1. **Click "View All Appointments"**
2. **Test filters:**
   - Click "Pending" tab
   - Click "Confirmed" tab
   - Click "Completed" tab
   - Click "Cancelled" tab
3. **Test search:**
   - Type patient name in search box
   - Verify filtering works

**Expected Result:** ✅ Filtering and search work correctly

---

## 🔍 Database Verification

### Check Appointment Creation

```javascript
// In MongoDB
db.appointments.find().sort({createdAt: -1}).limit(5)
```

**Should show:**
- Patient ID
- Doctor ID
- Date and time
- Status
- Payment info

---

### Check Cancellation

```javascript
// In MongoDB
db.appointments.find({status: 'cancelled'})
```

**Should show:**
- Cancellation details
- Refund amount
- Cancelled by (patient/doctor)

---

## 🐛 Common Issues & Solutions

### Issue 1: Doctor not redirected to dashboard
**Solution:** Check that user role is set to 'doctor' in database

### Issue 2: No appointments showing
**Solution:** 
- Verify doctor has appointments in database
- Check date filters (today's date)
- Ensure appointments are not all cancelled

### Issue 3: Chatbot not responding
**Solution:**
- Check backend is running
- Verify chatbot routes are registered
- Check browser console for errors

### Issue 4: Can't update appointment status
**Solution:**
- Verify doctor owns the appointment
- Check authentication token is valid
- Ensure backend route is accessible

---

## ✅ Success Criteria

### Chatbot:
- [ ] Can book appointment end-to-end
- [ ] Refund calculation is correct
- [ ] Rescheduling updates database
- [ ] Context is maintained during conversation
- [ ] Error messages are clear

### Doctor Dashboard:
- [ ] Doctor redirected after login
- [ ] Today's appointments display correctly
- [ ] Stats are accurate
- [ ] Can confirm appointments
- [ ] Can complete appointments
- [ ] Can cancel appointments
- [ ] Search and filter work
- [ ] All appointments page loads

---

## 📊 Test Data Setup

### Create Test Doctor with Availability

```javascript
// Set doctor availability (in MongoDB or via API)
{
  availability: {
    monday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
    thursday: { isAvailable: true, startTime: "09:00", endTime: "17:00" },
    friday: { isAvailable: true, startTime: "09:00", endTime: "17:00" }
  }
}
```

### Create Test Patient

1. Register as patient via signup form
2. Login and test chatbot

---

## 🎯 Performance Checks

- [ ] Dashboard loads in < 2 seconds
- [ ] Chatbot responds in < 1 second
- [ ] Appointment updates are instant
- [ ] No console errors
- [ ] Mobile responsive

---

## 📝 Notes

- Test with multiple doctors and patients
- Verify edge cases (past dates, invalid times)
- Check error handling (network failures)
- Test concurrent bookings for same slot

---

**Happy Testing!** 🚀

If you find any issues, check:
1. Backend logs
2. Frontend console
3. Network tab in DevTools
4. MongoDB data
