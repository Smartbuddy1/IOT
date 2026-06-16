@echo off
cd c:\Users\Admin\Desktop\SmartBuddy28May\server
start "SmartBuddy Backend" cmd.exe /k ""C:\Program Files\nodejs\npm.cmd" run dev"
cd c:\Users\Admin\Desktop\SmartBuddy28May\frontend
start "SmartBuddy Frontend" cmd.exe /k ""C:\Program Files\nodejs\npm.cmd" run dev"
