
async function fetchData(url){
    try {
        let response = await fetch(url);

        if (!response.ok) {
            return undefined;
        } else {
            let json = await response.json();
            return json;
        }
    } catch (e) {
        return undefined;
    }
}

async function getSeasons(){
    return fetchData("https://ergast.com/api/f1/seasons.json?offset=44&limit=100");
}

async function getConstructors(year){
    return fetchData(`https://ergast.com/api/f1/${year}/constructors.json`);
}

async function getQualifying(year, constructorId){
    return fetchData(`https://ergast.com/api/f1/${year}/constructors/${constructorId}/qualifying.json?limit=60`);
}

// Update constructors list
async function selectOnChange(event){
    const year = event.target.value;
    const selectedConstructor = document.getElementById("constructorList").value;
    let results = await getConstructors(year);
    if(results){
        fillConstructorsList(results, selectedConstructor);
    }
}

// Convert milliseconds to minutes,seconds,milliseconds
function millisecondsToStruct(time){
    const newTime = {};
    newTime.isNegative = time < 0 ? true : false;
    time = Math.abs(time);
    newTime.minutes = Math.floor(time/60000);
    time = time % 60000;
    newTime.seconds = Math.floor(time/1000);
    newTime.milliseconds = time % 1000;
    return newTime;
}

// Convert time string into milliseconds
function convertTimeString(time){
    let milliseconds = 0;
    const tkns = time.split(":");
    if(tkns.length === 2){
        milliseconds += (parseInt(tkns[0]) * 60000);
        const tkns2 = tkns[1].split(".");
        milliseconds += parseInt(tkns2[0] * 1000);
        milliseconds += parseInt(tkns2[1]);
        return milliseconds
    }else{
        const tkns2 = tkns[0].split(".");
        milliseconds += parseInt(tkns2[0] * 1000);
        milliseconds += parseInt(tkns2[1]);
        return milliseconds
    }
}

function createTable(driver1, driver2) {

    const div = document.getElementById("tables");

    const table = document.createElement("table");
    const tr = document.createElement("tr");
    table.appendChild(tr);

    let th1 = document.createElement("th");
    th1.appendChild(document.createTextNode("Race"));
    th1.className = "row-1";
    tr.appendChild(th1);

    th1 = document.createElement("th");
    th1.appendChild(document.createTextNode(driver1.name));
    th1.className = "row-2";
    tr.appendChild(th1);

    th1 = document.createElement("th");
    th1.appendChild(document.createTextNode(driver2.name));
    th1.className = "row-4";
    tr.appendChild(th1);

    th1 = document.createElement("th");
    th1.appendChild(document.createTextNode("Difference"));
    th1.className = "row-4";
    tr.appendChild(th1);

    div.appendChild(table);
    return {
        table: table,
        id: `${driver1.id}${driver2.id}`,
        sameRaceCount: 0,
        raceCount: 0,
        cumulativeDifference: 0,
        driver1Better: 0,
    };

}

function newDriver(d) {
    return {
        name: `${d.Driver.givenName} ${d.Driver.familyName}`,
        id: d.Driver.driverId,
        ref: d,
    }
}

function bestTime(driver) {
    let bestTime = {
        time: "N/A",
        session: "1",
    };
    if (driver.ref.Q1) {
        if (driver.ref.Q1 < bestTime) {
            bestTime.time = driver.ref.Q1
            bestTime.session = 1
        }
    }
    if (driver.ref.Q2) {
        bestTime.time  = driver.ref.Q2
        bestTime.session = 2
    }
    if (driver.ref.Q3) {
        bestTime.time = driver.ref.Q3
        bestTime.session = 3
    }
    return bestTime;
}

function newTd(text, bold, styleOptions){
    let td = document.createElement("td");
    if(bold){
        let bold = document.createElement("strong");
        let textNode = document.createTextNode(text);
        bold.appendChild(textNode);
        td.appendChild(bold);
    }
    else{
        td.appendChild(document.createTextNode(text));
    }
    if(styleOptions){
        for (let key of Object.keys(styleOptions)) {
            td.style[key] = styleOptions[key];
        }
    }
    
    return td;
}

function displayMeanTime(currentTable){
    const tr = document.createElement("tr");
    currentTable.table.appendChild(tr);

    tr.appendChild(newTd("Mean difference when in same session", true, { textAlign: "left", borderTop: "4px solid #586eff"})); 

    tr.appendChild(newTd("", false, { borderTop: "4px solid #586eff" }));
    tr.appendChild(newTd("", false, { borderTop: "4px solid #586eff" }));

    // If driver pairing have only 1 race and someone didnt qualify then this might be 0
    if (currentTable.sameRaceCount >= 1){
        const meanTime = millisecondsToStruct(currentTable.cumulativeDifference / currentTable.sameRaceCount);
        const tdText = `${meanTime.isNegative ? "-" : "+"}${meanTime.minutes}:${meanTime.seconds}.${Math.round(meanTime.milliseconds)}`;
        let tdColour = "#85FF78"
        if (meanTime.isNegative) {
            tdColour = "#FF7878";
        }
        tr.appendChild(newTd(tdText, true, { backgroundColor: tdColour, borderTop: "4px solid #586eff" }));
    }   
}

function displayQualyScore(currentTable){
    const tr = document.createElement("tr");
    currentTable.table.appendChild(tr);

    tr.appendChild(newTd("Qualifying score", true, { textAlign: "left" })); 

    tr.appendChild(newTd("", false));
    tr.appendChild(newTd("", false));


    const tdText = `${currentTable.driver1Better} - ${currentTable.raceCount - currentTable.driver1Better}`
    let tdColour = "#ffc478"
    if (currentTable.driver1Better > (currentTable.raceCount - currentTable.driver1Better)) {
        tdColour = "#85FF78";
    }
    else if (currentTable.driver1Better < (currentTable.raceCount - currentTable.driver1Better)) {
        tdColour = "#FF7878";
    }
    tr.appendChild(newTd(tdText, true, { backgroundColor: tdColour}));
}


// Create all qualifying tables
function createQualifyingTable(results){

    const div = document.getElementById("tables");
    div.innerHTML = "";
    
    let currentTable = undefined;
    let tableList = [];
    let driverList = [];

    const races = results.MRData.RaceTable.Races;
    for(let i = 0; i<races.length; i++){

        //Dont record when only one driver entry
        if (races[i].QualifyingResults.length !== 2){
            continue;
        }

        races[i].QualifyingResults.sort((a,b) =>{
            return a.number - b.number;
        });

        let driver1Id = races[i].QualifyingResults[0].Driver.driverId;
        let driver2Id = races[i].QualifyingResults[1].Driver.driverId;

        const driver1 = newDriver(driver1Id < driver2Id ? races[i].QualifyingResults[0] : races[i].QualifyingResults[1]);
        const driver2 = newDriver(driver1Id > driver2Id ? races[i].QualifyingResults[0] : races[i].QualifyingResults[1]);

        // Create a table for each driver pairing
        if(i === 0){
            table = createTable(driver1, driver2);
            currentTable = table;
            tableList.push(table);
        }else{
            const newTableId = `${driver1.id}${driver2.id}`;
           // const reverseTableId = `${driver2.id}${driver1.id}`; // Sometimes the driver order switches

            let found = false;
            for(let i = 0; i<tableList.length; i++){
                if (tableList[i].id == newTableId ){
                    currentTable = tableList[i];
                    found = true;
                    break;
                }
            }
            if(!found){
                table = createTable(driver1, driver2);
                currentTable = table;
                tableList.push(table);
            }
        }
        
        const tr = document.createElement("tr");
        currentTable.table.appendChild(tr);

        tr.appendChild(newTd(`${races[i].round}: ${races[i].raceName}`, false, {textAlign: "left"}));

        const d1BestTime = bestTime(driver1)
        tr.appendChild(newTd(`Q${d1BestTime.session} ${d1BestTime.time}`, false));

        const d2BestTime = bestTime(driver2)
        tr.appendChild(newTd(`Q${d2BestTime.session} ${d2BestTime.time}`, false));

        if (d1BestTime === "N/A" || d2BestTime === "N/A"){
            continue;
        }

        currentTable.raceCount++
        //Only compare times if they where in the same final session.
        let tdText = "Different sessions";
        let tdColour = "#85FF78"
        if(d1BestTime.session === d2BestTime.session){
            let timeDifference = convertTimeString(d2BestTime.time) - convertTimeString(d1BestTime.time);
            currentTable.cumulativeDifference += timeDifference;
            currentTable.sameRaceCount++;
            const time = millisecondsToStruct(timeDifference);
            tdText = `${time.isNegative ? "-" : "+"}${time.minutes}:${time.seconds}.${time.milliseconds}`
            
            if (time.isNegative) {
                tdColour = "#FF7878";
            }
            else {
                currentTable.driver1Better++;
            }
        }else{
            
            if(d1BestTime.session > d2BestTime.session){
                currentTable.driver1Better++;     
            }else{
                tdColour = "#FF7878";
            }
        }  
        
        tr.appendChild(newTd(tdText, false, { backgroundColor: tdColour }));
    }


    for (let i = 0; i < tableList.length; i++) {
        displayMeanTime(tableList[i])
        displayQualyScore(tableList[i])
    }
    
}

// Add constructors to dropdown list
function fillConstructorsList(list, currentSelect){
    const select = document.getElementById("constructorList");
    select.innerHTML = "";
    list.MRData.ConstructorTable.Constructors.forEach((elm) =>{
        const option = document.createElement("option");
        option.value = elm.name;
        option.innerHTML = elm.name;
        option.id = elm.constructorId;
        select.appendChild(option);
        // Keep current constructor selected if available
        if (elm.name == currentSelect){
            select.value = currentSelect;
        }
    });
}

async function displayResults(){
    const yearList = document.getElementById("seasonList");
    const constructorList = document.getElementById("constructorList");
    
    const options = constructorList.options;
    const constructorId = options[options.selectedIndex].id;
    const year = yearList.value;

    const qualifying = await getQualifying(year, constructorId);
    createQualifyingTable(qualifying);
}

async function main(){
    const select = document.getElementById("seasonList");
    select.addEventListener("change", selectOnChange);

    const goButton = document.getElementById("go");
    goButton.addEventListener("click", displayResults);

    let results = await getSeasons();
    if(results){
        results.MRData.SeasonTable.Seasons.reverse();

        //fill constructor table for first option
        const list = await getConstructors(results.MRData.SeasonTable.Seasons[0].season);
        if(list){
            fillConstructorsList(list);
        }

        results.MRData.SeasonTable.Seasons.forEach((elm) =>{
            const option = document.createElement("option");
            option.value = elm.season;
            option.innerHTML = elm.season;
            select.appendChild(option);
        });
    }
}

window.addEventListener("load", () =>{
    main();
});



