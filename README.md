# jumpforceTool
A tool for the game Jump Force. like switching file inside Uexp files (Unreal)
Notice: theorically, it's could work on some others games's files witch use Unreal Engine, but it's not tested enought. 

#usage
There is 3 parts, one for the package, on for uasset and one for uexp. uasset + uexp == a pakage.
You can drag and drop/load or save file in differents part to extract/repack. 
The goal is to edit a package by adding, removing, re-order files inside it. 

allowed BndFll files : .san, .prm, .flw, .fld, .sad, .lip, .frmd, .srdp, .stx
and also the .uasset and .uexp are loadable.


#about
This project is dev like a web site, and Electron (using Node.js and Chrominium) make it as a application.
As it's a web technologie (html, javascript, css) , it's could be easely updated for better UI, or add/correct features.

Electron have 2 mains process: 
-the main.js process witch, same is in javascript, is in context of application
-the rendered.js for the classic web interactions.


#installation
So first, you need to have Node.js installed on yours computer.

Open a command line ("cmd") and go to the folder of the tool. 
You need to get all dependencies, with (Could take many minutes, depend of internet connection): 
npm install

To test the tool type : 
electron .
  
You can close the tool opened.

You can add the folder into VisualCode, not sure you have to add a plugins to make it work.
You have in the debugger part, a new way to launch the debug mode for this Electron case. you could make breakpoint in VisualCode to debug main.js part, and make   


At the end, to build the result into a application use :
electron-packager . --all 
I only test the jumpforcetool-win32-x64, but normally the rest should work.
Notice: if there is trouble on this step , you may be missing framework .Net 4.5, or powerShell v3.0 (that happen on Windows 7, here the solution to install it : https://devblogs.microsoft.com/scripting/weekend-scripter-install-powershell-3-0-on-windows-7/)  


 
