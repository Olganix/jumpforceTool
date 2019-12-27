
const {ipcRenderer} = require('electron')
const {BrowserWindow} = require('electron').remote
const path = require('path')
const fs = require('fs');

let $ = window.$ = window.jQuery = require('jquery');
require('jquery-ui-dist/jquery-ui')             //https://stackoverflow.com/questions/34485506/jquery-ui-and-electron


//Todo in future :
//add a button to get the FileId from the filename.
//solve the f..king drag ghost /selection (we prefere use the small dragHolder for sortable)
//may be on drag and drop externe = save, specially avoid rederer.js
//may be add a multi Selection (Shift or ctrl selection)


document.addEventListener("DOMContentLoaded", function()
{

    let lastId = null;
    let uniqueId = 0;
    let uasset_file = null;             //{id: uniqueId++, filename: "", path: "", data: "" }
    let uexp_files = [];

    let bndfll_Extensions = ['apb', 'asb', 'enumdef', 'fld', "flw", "frmd", 'lip', 'lua', 'msb', 'nmb', "prm", 'prmdef', 'repb', 'san', "srdp", "stx", "sad"];
    //after a check if all san have the id 0x08d6831d, prm have 0x08d68768, we can say, there is a link between the extension and the useId, but it's not exclusive and unique. few extensions could have the same id, and a extension could have few id (but there is a specific thing in name matching the useId).

    

    //Can't success to have relative path of images inside html. they need __dirname :
    document.querySelectorAll('.bt_load > img').forEach( function(img){ img.src = `file://${__dirname}/img/load_file.png`; });
    document.querySelectorAll('.bt_save > img').forEach( function(img){ img.src = `file://${__dirname}/img/save_file.png`; });
    document.querySelectorAll('.bt_delete > img').forEach( function(img){ img.src = `file://${__dirname}/img/close_file.png`; });



    //load/save/drag and drop file depend of the part
    document.querySelectorAll('.bt_load').forEach((bt) => 
    {
        bt.addEventListener('click', () =>
        {
            lastId = (bt.classList.contains("importUexp")) ? "listUexp" : bt.parentElement.parentElement.id;
            ipcRenderer.send("openFileDialog");
        });
    });

    document.querySelectorAll('.bt_save').forEach((bt) => 
    {
        bt.addEventListener('click', () =>
        {
            lastId = (bt.classList.contains("extractUexp")) ? "extractUexp" : bt.parentElement.parentElement.id;
            let defaultFilename = bt.parentElement.parentElement.querySelector(".dragArea_filename").innerText;
            defaultFilename = (((lastId!="extractUexp")&&(defaultFilename!="Import Uasset file")&&(defaultFilename!="Import package")) ? defaultFilename : null);
            ipcRenderer.send("saveFileDialog", defaultFilename );
        });
    });

    document.querySelectorAll('.bt_delete').forEach((bt) => 
    {
        bt.addEventListener('click', () =>
        {
            if(bt.classList.contains("clearPackage"))
            {
                clearUasset();
                clearAllBndfll();
                document.querySelector("#importPackage .dragArea_filename").innerHTML = "Import package";
            }else if(bt.parentElement.parentElement.id==="Uasset"){
                clearUasset();
            }else if(bt.classList.contains("clearAll")){
                clearAllBndfll();
            }
        });
    });


    document.querySelectorAll('.dragArea_file').forEach((div) => 
    {
        
        div.addEventListener('dragstart', (event) =>
        {
            return false;
            //lastId = div.id;
            //event.preventDefault();
            //ipcRenderer.send("dragstart", __filename);
        });
        

        div.ondragover = () => { return false; };
        div.ondragleave = () => { return false; };
        div.ondragend = () => { return false; };

        div.ondrop = (e) => 
        {
            e.preventDefault();
            e.stopPropagation();

            lastId = div.id;
            loadFiles(e.dataTransfer.files);
            
            return false;
        };
    });


    ipcRenderer.on('selectedFile', (event, paths) =>  {  if(paths!=undefined) loadFile(paths.filePaths[0]); });
    ipcRenderer.on('savedFile', (event, path) => {  if(path!=undefined) saveFile(path.filePath);  });


    // drag fro re-order
    $(".subFiles_container_uexps").sortable(
    {
        items: "> .dragArea_file",
        handle: ".dragHolder",
        
        stop: function( event, ui ) 
        {
            let old = uexp_files;
            uexp_files = [];

            let listDiv = $(".subFiles_container_uexps .dragArea_file");
            for(let jq_tmp of listDiv)
            {
                let id_tmp = Number(jq_tmp.id.substr(5));

                for(let o of old)
                {
                    if(o.id == id_tmp)
                    {
                        uexp_files.push(o);
                        break;
                    }
                }
            }
        }
    });
    $(".subFiles_container_uexps, .dragArea_file, .dragArea_filename").disableSelection();

    

    ///////////////////////////////////////////////////////////
    function loadFiles(files)
    {
        for (let f of files) 
        {
            loadFile(f.path);

            if(lastId !== "listUexp")            //only one file, most of time, except listUexp witch will add files.
                break;
        }
    }
    
    function loadFile(path)
    {
        log("trace", `loading ${path}.`);

        if(lastId==="importPackage")
        {
            let extension = getFileExtension(path);
            if((extension!=="uasset")&&(extension!=="uexp"))
            {
                log("error", `file not valid for 'Import Package', only uasset, and uexp files accepted, but not : ${path}.`, 10);
                return;
            }

            let path_filename_noExt = getFileFullPath_withoutExtension(path);

            document.querySelector("#importPackage .dragArea_filename").innerHTML = getFileBaseName(path) +".uasset";

            clearAllBndfll();

            __loadFile(path_filename_noExt +".uasset", setUassetFile);
            __loadFile(path_filename_noExt +".uexp", addUexpFile);

        }else if(lastId==="Uasset"){

            let extension = getFileExtension(path);
            if(extension!=="uasset")
            {
                log("error", `file not valid for 'Import Uasset', only uasset files accepted, but not : ${path}.`, 10);
                return;
            }

            __loadFile(path, setUassetFile);


        }else if(lastId==="listUexp"){

            let extension = getFileExtension(path);

            let isFound = false;
            let forMessage = "";
            for(let allow of bndfll_Extensions)
            {
                if(allow == extension)
                {
                    isFound = true;
                    break;
                }
                forMessage += allow +", ";
            }

            if((extension!=="uexp")&&(!isFound))
            {
                log("error", `file not valid for 'Import Uexp', only uexp, ${forMessage} files accepted, but not : ${path}.`, 10);
                return;
            }

            if(extension==="uexp")
                __loadFile(path, addUexpFile);
            else
                __loadFile(path, addBndFllFile);

        }else if((lastId!==null)&&(lastId.length>5)&&(lastId.substr(0,5)==="Uexp_")){

            let extension = getFileExtension(path);

            let isFound = false;
            let forMessage = "";
            for(let allow of bndfll_Extensions)
            {
                if(allow == extension)
                {
                    isFound = true;
                    break;
                }
                forMessage += allow +", ";
            }

            if(!isFound)
            {
                log("error", `file not valid for 'replace BDNFLL', only ${forMessage} files accepted, but not : ${path}.`, 10);
                return;
            }
            __loadFile(path, replaceBndfllFile);
        }
    }


    



    function setUassetFile(path, dataArray)
    {
        clearUasset();

        var id = uniqueId++;
        let filename = getFilename(path);

        document.querySelector("#Uasset .dragArea_filename").innerHTML = filename;
        uasset_file = {id: id, filename: filename, path: path, data: dataArray};
    }


    function addUexpFile(path, dataArray)
    {
        for(let file of extractBndfllFromUexp(path, dataArray))
            addBndFllFile(file.path, file.data, file.filename, file.fileID, file.unknow1, file.unknow2);
    }


    function addBndFllFile(path, dataArray, filename, fileID, unknow1, unknow2)
    {
        var id = uniqueId++;
        
        if(filename==undefined) filename = getFilename(path);
        if(fileID==undefined) fileID = 0;
        if(unknow1==undefined) unknow1 = 0;
        if(unknow2==undefined) unknow2 = 0;

        document.querySelector(".subFiles_container_uexps").innerHTML +=`
<div class="dragArea_file Uexp" id="Uexp_${id}" data-idp="${id}" draggable="true">
    <div class="dragArea_bts">
        <button class="bt_load"><img src="file://${__dirname}/img/load_file.png" /></button>
        <button class="bt_save"><img src="file://${__dirname}/img/save_file.png" /></button>
        <button class="bt_delete"><img src="file://${__dirname}/img/close_file.png" /></button>
    </div>
    
    <div class="dragHolder"></div>
    <div class="dragArea_filename">${filename}</div>
    <input class="dragArea_input fileId" data-target="fileId" value="${fileID}" placeholder="fileId" />
    <input class="dragArea_input unknow1" data-target="unknow1" value="0x${toHexa(unknow1)}" placeholder="unknow1" />
    <input class="dragArea_input unknow2" data-target="unknow2" value="0x${toHexa(unknow2)}" placeholder="unknow2" />
</div>
        `;
        uexp_files.push({id: id, filename: filename, path: path, data: dataArray,
                            fileID: fileID, unknow1: unknow1, unknow2: unknow2});


        let listElements = document.querySelectorAll('.dragArea_file.Uexp .bt_load');       //not only the id because '.innerHtml += ' break the old events.
        for(let bt of listElements)
        {
            bt.addEventListener('click', () =>
            {
                lastId = bt.parentElement.parentElement.id;
                ipcRenderer.send("openFileDialog");
            });
        };
        listElements = document.querySelectorAll('.dragArea_file.Uexp .bt_save');
        for(let bt of listElements)
        {
            bt.addEventListener('click', () =>
            {
                lastId = bt.parentElement.parentElement.id;
                let defaultFilename = bt.parentElement.parentElement.querySelector(".dragArea_filename").innerText;
                defaultFilename = (((lastId!="extractUexp")&&(defaultFilename!="Import Uasset file")&&(defaultFilename!="Import package")) ? defaultFilename : null);
                ipcRenderer.send("saveFileDialog", defaultFilename);
            });
        };

        listElements = document.querySelectorAll('.dragArea_file.Uexp .bt_delete');
        for(let bt of listElements)
        {
            bt.addEventListener('click', () =>
            {
                lastId = bt.parentElement.parentElement.id;
                removeBndfllFile();
            });
        };


        listElements = document.querySelectorAll('.dragArea_file.Uexp .dragArea_input');
        for(let ip of listElements)
        {
            ip.addEventListener('change', () =>
            {
                lastId = ip.parentElement.id;
                let id = Number(lastId.substr(5));
                let value = ip.value;

                for(let f of uexp_files)
                {
                    if(f.id===id)
                    {
                        f[ip.dataset.target] = (ip.dataset.target=="fileId") ? Number(value) : fromHexa(value);
                        break;
                    }
                }
            });
        };

        
    }


    function replaceBndfllFile(path, dataArray)
    {
        if((lastId===null)||(lastId.length<=5)||(lastId.substr(0,5)!=="Uexp_"))
        {
            log("error", "error on replaceBndfllFile, missing correct lastId.", 10);
            return;
        }

        let filename = getFilename(path);
        uexp_files[i].filename = filename;
        uexp_files[i].path = path;
        uexp_files[i].data = dataArray;

        document.querySelector("#"+ lastId).innerHTML = filename;
    }
    function removeBndfllFile()
    {
        if((lastId===null)||(lastId.length<=5)||(lastId.substr(0,5)!=="Uexp_"))
        {
            log("error", "error on removeBndfllFile, missing correct lastId.", 10);
            return;
        }

        let id = Number(lastId.substr(5));

        let div = document.querySelector("#"+ lastId);
        div.parentElement.removeChild(div);

        for(let i=0;i<uexp_files.length;i++)
        {
            if(uexp_files[i].id===id)
            {
                log("info", "file "+ uexp_files[i].filename +" removed");
                uexp_files.splice(i, 1);
                break;
            }
        }
    }


    function clearUasset()
    {
        document.querySelector("#Uasset .dragArea_filename").innerHTML = "Import Uasset file";
        uasset_file = null;
    }
    function clearAllBndfll()
    {
        let listUexp = document.querySelector(".subFiles_container_uexps");
        let listToDel = listUexp.querySelectorAll(".dragArea_file.Uexp")
        for(let elem of listToDel)
            listUexp.removeChild(elem);
        uexp_files = [];
    }

    



    ////////////////////////////////////////////////

    function saveFile(path)
    {
        if(!path)
        {
            log("debug", `No path`);
            return;
        }

        log("trace", `saving ${path}.`);
        let basePath = getFilePath(path);


        if(lastId == "extractUexp")
        {
            for (let f of uexp_files) 
                __saveFile(basePath + f.filename, f);
        }

        if(lastId == "Uasset")
        {
            if(uasset_file!=null)
                return __saveFile(path, uasset_file);
        }

        if((lastId!==null)&&(lastId.length>5)&&(lastId.substr(0,5)==="Uexp_"))
        {
            let id = Number(lastId.substr(5));
            for (let f of uexp_files) 
                if(f.id === id)
                    __saveFile(path, f);
        }

        if(lastId=="importPackage")
        {
            if(uasset_file==null)
            {
                log("error", "error: uasset_file not loaded. needed as model to make a new one.", 10);
                return;
            }
            if(uexp_files.length==0)
            {
                log("error", "error: no BDNFLL files to package.", 10);
                return;
            }

            let uexpFile = makeUexpFromBndfll(uexp_files, uasset_file);
            let uasset_file_tmp = makeAAdaptedCopyOf(uasset_file, uexpFile);

            let basePath = getFilePath(path) + getFileBaseName(path);
            __saveFile(basePath +".uasset", uasset_file_tmp);
            __saveFile(basePath +".uexp", uexpFile);
        }
    }   




























    //////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// Uexp binary ////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////

    function extractBndfllFromUexp(path, dataArray)
    {
        let basePath = getFilePath(path);
        let bndfll_files = [];
    
        
        document.querySelector("#uexp_startId").value = "0x"+ toHexa(dataArray[fromHexa("00")]);
        if((dataArray[fromHexa("00")] != 7) && (dataArray[fromHexa("00")] != 6))
            log("warning", "Uexp file with another than 07 00 00 00 (at 0x00) or 0x06: "+ toHexa(dataArray[fromHexa("00")]), 10);


        let startBndFll = fromHexa("14");
        if( (dataArray[startBndFll]     != fromHexa("42")) || 
            (dataArray[startBndFll + 1] != fromHexa("4E")) ||
            (dataArray[startBndFll + 2] != fromHexa("44")) ||
            (dataArray[startBndFll + 3] != fromHexa("46")) ||
            (dataArray[startBndFll + 4] != fromHexa("4C")) ||
            (dataArray[startBndFll + 5] != fromHexa("4C")) )
        {
            log("error", "Not a BNDFLL in Uexp file. skipping ("+ path +")", 10);
            return;
        }

        document.querySelector("#bndfll_unknow").value = "0x"+ toHexa(dataArray[fromHexa("1C")]);
        if(dataArray[fromHexa("1C")] != 1)
            log("warning", "BNDFLL file with another than 01 00 00 00 (at 0x1C of Uexp): "+ toHexa(dataArray[fromHexa("1C")]), 10);    

        let nbFiles = getUint32(dataArray, fromHexa("20"));
        let startOffsetFilesHeader = getUint32(dataArray, fromHexa("24")) + startBndFll;
        let sizeFileHeader = getUint32(dataArray, fromHexa("28"));
        let startOffsetFilesDatas = getUint32(dataArray, fromHexa("34")) + startBndFll;

        let startOffsetNextFileHeader = getUint32(dataArray, fromHexa("3C")) + startBndFll;


        for(let i=0;i<nbFiles;i++)
        {
            let startOffset_hdr = startOffsetFilesHeader + sizeFileHeader * i;
            //let startOffset_hdr = startOffsetNextFileHeader;                            //normally the same as previous line

            let fileID = getUint32(dataArray, startOffset_hdr);
            //let unknow0 = getUint32(dataArray, startOffset_hdr + fromHexa("4"));      //always 0x10 ? => certainly offset for a subHeader file , witch could explain the both size of file.
            let fileSize = getUint32(dataArray, startOffset_hdr + fromHexa("8"));
            //let fileSize2 = getUint32(dataArray, startOffset_hdr + fromHexa("10"));

            let unknow1 = getUint32(dataArray, startOffset_hdr + fromHexa("18"));
            let unknow2 = getUint32(dataArray, startOffset_hdr + fromHexa("1C"));     //always 1D 83 D6 08
            let startOffsetFileName = getUint32(dataArray, startOffset_hdr + fromHexa("20")) + startBndFll;

            startOffsetNextFileHeader = getUint32(dataArray, startOffset_hdr + fromHexa("28")) + startBndFll;

            let filename = "";
            let offsetChar = startOffsetFileName;
            while(dataArray[offsetChar]!=0)
                filename += String.fromCharCode(dataArray[offsetChar++]);


            let startOffsetFileData = getUint32(dataArray, startOffset_hdr + fromHexa("30")) + startOffsetFilesDatas;            
            let fileDataArray = dataArray.subarray(startOffsetFileData, startOffsetFileData + fileSize);

            bndfll_files.push(  {filename: filename, fileID: fileID, path: basePath + filename, data: fileDataArray, unknow1: unknow1, unknow2: unknow2});
        }

        return bndfll_files;
    }


















    function makeUexpFromBndfll(uexp_files, uasset_file)
    {
        let startBndFll = fromHexa("14");

        let filesize = startBndFll + 4;       // header before BNDFF + last value id (from uasset)
        let startOfFileNames = fromHexa("30") + fromHexa("38") * uexp_files.length;      //header of BNDFF + headers of each files 
        let startOfFileData_without_firstHeader = startOfFileNames;
        for(let f of uexp_files)
        {
            startOfFileData_without_firstHeader += f.filename.length + 1;       //filename string + \0
            filesize += f.data.length;                                          //file data
        }
        filesize += startOfFileData_without_firstHeader;

        let startOffsetFilesHeader = fromHexa("30");
        let sizeFileHeader = fromHexa("38");

        
        let buffer = new Uint8Array(filesize);
        

        setUint32(buffer, fromHexa("0"), fromHexa( document.querySelector("#uexp_startId").value ));
        setUint32(buffer, fromHexa("C"), filesize - (startBndFll + 4) );

        buffer[startBndFll ]    = fromHexa("42");           //BNDFLL flag
        buffer[startBndFll + 1] = fromHexa("4E");
        buffer[startBndFll + 2] = fromHexa("44");
        buffer[startBndFll + 3] = fromHexa("46");
        buffer[startBndFll + 4] = fromHexa("4C");
        buffer[startBndFll + 5] = fromHexa("4C");
        
        setUint32(buffer, fromHexa("1C"), fromHexa( document.querySelector("#bndfll_unknow").value ));
        setUint32(buffer, fromHexa("20"), uexp_files.length);
        setUint32(buffer, fromHexa("24"), startOffsetFilesHeader);
        setUint32(buffer, fromHexa("28"), sizeFileHeader);

        setUint32(buffer, fromHexa("34"), startOfFileData_without_firstHeader);     //start of file data
        setUint32(buffer, fromHexa("3C"), startOffsetFilesHeader);


        let offsetFileData = 0;
        let offsetFileNames = startOfFileNames;
        for(let i=0;i<uexp_files.length;i++)
        {
            let file = uexp_files[i];
            let startOffset_hdr = startBndFll + startOffsetFilesHeader + sizeFileHeader * i;
            
            setUint32(buffer, startOffset_hdr, file.fileID);
            setUint32(buffer, startOffset_hdr + fromHexa("4"), fromHexa("10"));
            setUint32(buffer, startOffset_hdr + fromHexa("8"), file.data.length);
            setUint32(buffer, startOffset_hdr + fromHexa("10"), file.data.length);

            setUint32(buffer, startOffset_hdr + fromHexa("18"), file.unknow1);
            setUint32(buffer, startOffset_hdr + fromHexa("1C"), file.unknow2);          //apparently it's a unique code from file extension, it's a fileTypeId.

            setUint32(buffer, startOffset_hdr + fromHexa("20"), offsetFileNames);

            setUint32(buffer, startOffset_hdr + fromHexa("28"), (i+1 !== uexp_files.length) ? (startOffset_hdr - startBndFll + sizeFileHeader) : 0);    //next file header
            setUint32(buffer, startOffset_hdr + fromHexa("30"), offsetFileData);

            for(let j=0; j <= file.filename.length;j++)
                buffer[startBndFll + offsetFileNames + j] = (j!=file.filename.length) ? file.filename.charCodeAt(j) : 0;       // ou \0
            offsetFileNames += file.filename.length + 1;


            buffer.set(file.data, startBndFll + startOfFileData_without_firstHeader + offsetFileData);
            offsetFileData += file.data.length;
        }


        setUint32(buffer, filesize - 4,  getUint32(uasset_file.data, 0));       //a id was at start of uasset and the end of uexp.
        
        return {id: -1, filename: uasset_file.filename, path: uasset_file.path, data: buffer};
    }


    function makeAAdaptedCopyOf(uasset_file, uexpFile)
    {
        let newUasset_file = {id: uasset_file.id, filename: uasset_file.filename, path: uasset_file.path, data: (new Uint8Array(uasset_file.data)) };

        setUint32(newUasset_file.data, fromHexa("1F9"), uexpFile.data.length - 4);           //size of uexpFile - 4 (the end id, witch is the same as start of uasset)

        return newUasset_file;
    }
    





    //////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// Common ////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    


    //////////// binary basic operations :

    function getUint16(dataArray, startIndex) { return getUint(dataArray, startIndex, 2); }
    function getUint32(dataArray, startIndex) { return getUint(dataArray, startIndex, 4); }
    function getUint64(dataArray, startIndex) { return getUint(dataArray, startIndex, 8); }
    function setUint16(dataArray, startIndex, value) { return setUint(dataArray, startIndex, value, 2); }
    function setUint32(dataArray, startIndex, value) { return setUint(dataArray, startIndex, value, 4); }
    function setUint64(dataArray, startIndex, value) { return setUint(dataArray, startIndex, value, 8); }

    function getUint(dataArray, startIndex, nbOctets) 
    {
        let ret = 0;
        for(let i=0;i<nbOctets;i++)
            ret += dataArray[startIndex + i] * Math.pow(16, 2*i);
        return ret;
    }
    function setUint(dataArray, startIndex, value, nbOctets) 
    {
        for(let i=0;i<nbOctets;i++)
            dataArray[startIndex + i] = (value & ( (Math.pow(16, 2*(i + 1)) - 1) - (Math.pow(16, 2*i) - 1) )) / Math.pow(16, 2*i);
    }

    function fromHexa(str) {return parseInt(str, 16);}                      //number from hexaedecimale in string (could also have "0x" in front)
    function toHexa(value) {return value.toString(16);}                     //string hexadecimale from number, without the "0x"

    





    //////////// string function for path/filename :

    function getFilePath(path)
    {
        let filename = getFilename(path);
        return path.substr(0, path.length - filename.length);
    }
    function getFileFullPath_withoutExtension(path)
    {
        let extension = getFileExtension(path);
        return path.substr(0, path.length - (extension.length + 1));
    }

    function getFilename(path)
    {
        let pos = path.lastIndexOf("/");
        if(pos!=-1) path = path.substr(pos + 1);
        pos = path.lastIndexOf("\\");
        if(pos!=-1) path = path.substr(pos + 1);

        return path;
    }
    function getFileBaseName(path)
    {
        path = getFilename(path);
        let extension = getFileExtension(path);
        if(extension!=null)
            path = path.substr(0, path.length - (extension.length + 1) );
        
        return path;
    }
    function getFileExtension(filename)
    {
        let pos = filename.lastIndexOf(".");
        return (pos>=0) ? filename.substr(pos + 1).toLowerCase() : null;
    }




    //////////// I/O functions :

    function __loadFile(path, callback)
    {
        log("trace", `loading file ${path}.`);

        //fs.readFile(f.path, 'utf8', function (err, data)      //for text

        fs.readFile(path, function (err, data)      //for blob
        {
            if (err)
            {
                log("error", err, 10);
                return;
            }

            let dataArray = new Uint8Array(data);
            //var blob = new window.Blob([dataArray]);

            (callback)(path, dataArray);
        });
    }

    function __saveFile(path, elementFile)
    {
        log("trace", `saving file ${path}.`);

        fs.writeFile(path, elementFile.data, function (err)
        {
            if (err)
            {
                log("error", err, 10);
                return;
            }

            log("info", path + "  saved");
        });
    }


    //////////// logs display :

    let __useHtml = true;
    let __htmlFilter = ["info", "warn", "error"];
    let __htmlFilter_inversed = {info: false, trace: false, debug: false, warn: false, error: false};   //inversed to faster search on log function.
    let __useConsole = true;
    let __logUniqueId = 0;


    function initLog(useHtml, useConsole, htmlFilter)
    {
        if(useHtml!=undefined) __useHtml = useHtml;
        if(useConsole!=undefined) __useConsole = useConsole;
        if(htmlFilter!=undefined) __htmlFilter = htmlFilter;

        for(let f of __htmlFilter)
            __htmlFilter_inversed[f] = true;

        if(__useHtml)
        {
            let newElem = document.createElement("div");
            newElem.classList.add("log_container");
            document.querySelector("body").appendChild(newElem);
        }
    }
    initLog();

    function log(level, message, duration = 2)
    {
        if((__useHtml)&&(__htmlFilter_inversed[level]))
        {
            let newElem = document.createElement("div");
            newElem.classList.add("log_message", level);
            newElem.id = __logUniqueId++;
            newElem.innerHTML = message;
            
            document.querySelector(".log_container").appendChild(newElem)

            
            newElem.handlerTimeout = setTimeout(()=>
            {
                document.querySelector(".log_container").removeChild(newElem);
                newElem = null;
            }, duration * 1000);
            
            if(duration>1)
            {
                newElem.handlerTimeout_Anim = setTimeout(()=>                        //for animation disappeard, it's more soft
                {
                    newElem.classList.add("hiding");
                }, (duration - 1) * 1000);
            }
            

            newElem.addEventListener('click', ()=>
            {
                if(newElem.handlerTimeout!=undefined)
                    clearTimeout(newElem.handlerTimeout);
                if(newElem.handlerTimeout_Anim!=undefined)
                    clearTimeout(newElem.handlerTimeout_Anim);
                
                document.querySelector(".log_container").removeChild(newElem);
                newElem = null;
            });
        }
        if(__useConsole)
            console[level](message);
    }
    

});



