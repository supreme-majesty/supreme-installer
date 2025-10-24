# Table Creation Troubleshooting Guide

## 🔍 Debugging "Failed to create table" Error

### **Step 1: Check Prerequisites**

1. **Ensure you're logged in:**
   - Username: `admin`
   - Password: `admin123`

2. **Select a database first:**
   - Go to Database Browser tab
   - Click on a database name to select it
   - You should see the database name displayed next to "Tables"

3. **Verify the "New Table" button is enabled:**
   - If no database is selected, you'll see "Select a database to create tables"
   - If a database is selected, you'll see the "+ New Table" button

### **Step 2: Check Browser Console**

Open browser Developer Tools (F12) and check the Console tab for error messages:

**Expected console output when creating a table:**
```
Creating table with data: {database: "your_db", name: "table_name", schema: "..."}
Response status: 200
Response data: {success: true, message: "Table 'table_name' created successfully..."}
```

**Common error messages:**
- `Please select a database first` → Select a database before creating a table
- `Table name is required` → Enter a table name
- `Please add fields or provide a custom schema` → Add fields or use a template

### **Step 3: Test API Directly**

Test the table creation API directly:

```bash
# Get authentication token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test table creation
curl -X POST http://localhost:3001/api/database/table/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"database":"test_db","name":"test_table","schema":"id INT PRIMARY KEY"}'
```

### **Step 4: Common Issues and Solutions**

#### **Issue: "Please select a database first"**
**Solution:** 
1. Go to Database Browser tab
2. Click on a database name to select it
3. Try creating the table again

#### **Issue: "Table name is required"**
**Solution:**
1. Enter a table name in the modal
2. Table names should start with a letter and contain only letters, numbers, and underscores

#### **Issue: "Please add fields or provide a custom schema"**
**Solution:**
1. Select a template (Users, Posts, Products, Orders, Categories)
2. OR add custom fields using the field builder
3. OR enter a custom SQL schema

#### **Issue: "Network error: Failed to create table"**
**Solution:**
1. Check if server is running: `curl http://localhost:3001/api/auth/login`
2. Check browser console for detailed error messages
3. Restart development environment: `npm run clean && npm run dev:stable`

#### **Issue: "Invalid table name"**
**Solution:**
- Table names must start with a letter
- Can only contain letters, numbers, and underscores
- Cannot be reserved names like 'mysql', 'information_schema', etc.

### **Step 5: Verify Success**

After successful table creation:
1. The modal should close automatically
2. The tables list should refresh
3. Your new table should appear in the list
4. Console should show success message

### **Step 6: Test Table Creation Process**

1. **Login** → http://localhost:5173
2. **Navigate** to Database page
3. **Select** a database (click on database name)
4. **Click** "+ New Table" button
5. **Choose** creation method:
   - **Template**: Select from Users, Posts, Products, Orders, Categories
   - **Custom**: Build your own schema with field builder
6. **Enter** table name
7. **Click** "Create Table"

### **Step 7: Debug Information**

The updated code now includes console logging. Check the browser console for:
- `Creating table with data: {...}` - Shows the data being sent
- `Response status: 200` - Shows HTTP response status
- `Response data: {...}` - Shows server response

### **Step 8: Server Logs**

Check the server terminal for any error messages:
- Database connection issues
- SQL syntax errors
- Permission errors

### **Step 9: Reset if Needed**

If all else fails:
```bash
# Clean restart
cd /home/supreme-majesty/Documents/scripts/dev-env/supreme-dashboard
npm run clean
npm run dev:stable
```

## 🎯 Quick Checklist

- [ ] Logged in as admin
- [ ] Database selected
- [ ] Table name entered
- [ ] Template selected OR fields added OR custom schema provided
- [ ] Server running on port 3001
- [ ] Client running on port 5173
- [ ] No console errors
- [ ] Network requests successful
