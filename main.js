
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
    newTime.milliseconds = Math.floor(time % 1000);
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

    // Add headers
    const headers = [
        "Round",
        "Race",
        "Session Used",
        driver1.name,
        driver2.name,
        "Time Delta",
        "Delta %",
    ];

    headers.forEach((header, index) => {
        let th = document.createElement("th");
        th.appendChild(document.createTextNode(header));
        th.className = `row-${index + 1}`;
        tr.appendChild(th);
    });

    div.appendChild(table);
    return {
        table: table,
        id: `${driver1.id}${driver2.id}`,
        sameRaceCount: 0,
        raceCount: 0,
        timeDifferences: [], // Store all time differences for median calculation
        percentageDifferences: [], // Store all percentage differences for median calculation
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
    let times = {
        Q1: driver.ref.Q1 || null,
        Q2: driver.ref.Q2 || null,
        Q3: driver.ref.Q3 || null
    };
    
    return times;
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

function compareDriverTimes(driver1Times, driver2Times) {
    // Find the latest session where both drivers set a time
    let sessionUsed = null;
    let d1Time = null;
    let d2Time = null;

    if (driver1Times.Q3 && driver2Times.Q3) {
        sessionUsed = "Q3";
        d1Time = driver1Times.Q3;
        d2Time = driver2Times.Q3;
    } else if (driver1Times.Q2 && driver2Times.Q2) {
        sessionUsed = "Q2";
        d1Time = driver1Times.Q2;
        d2Time = driver2Times.Q2;
    } else if (driver1Times.Q1 && driver2Times.Q1) {
        sessionUsed = "Q1";
        d1Time = driver1Times.Q1;
        d2Time = driver2Times.Q1;
    }

    return {
        sessionUsed,
        d1Time,
        d2Time
    };
}

function calculateMedian(numbers) {
    if (numbers.length === 0) return 0;
    
    const sorted = numbers.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function displayMedianResults(currentTable) {
    // Display median time difference
    const tr1 = document.createElement("tr");
    currentTable.table.appendChild(tr1);

    tr1.appendChild(newTd("Median time difference", true, { 
        textAlign: "left", 
        borderTop: "4px solid #586eff"
    }));

    // Add empty cells for Round, Race, Session Used columns
    for (let i = 0; i < 2; i++) {
        tr1.appendChild(newTd("", false, { 
            borderTop: "4px solid #586eff" 
        }));
    }

    if (currentTable.timeDifferences.length >= 1) {
        const medianTime = millisecondsToStruct(calculateMedian(currentTable.timeDifferences));
        const tdText = `${medianTime.isNegative ? "-" : "+"}${medianTime.minutes > 0 ? medianTime.minutes + ":" : ""}${medianTime.seconds}.${medianTime.milliseconds}`;
        let tdColour = medianTime.isNegative ? "#FF7878" : "#85FF78";
        
        tr1.appendChild(newTd(tdText, true, { 
            backgroundColor: tdColour, 
            borderTop: "4px solid #586eff",
            colSpan: 4
        }));
    }

    // Display median percentage difference
    const tr2 = document.createElement("tr");
    currentTable.table.appendChild(tr2);

    tr2.appendChild(newTd("Median percentage difference", true, { 
        textAlign: "left"
    }));

    // Add empty cells for Round, Race, Session Used columns
    for (let i = 0; i < 2; i++) {
        tr2.appendChild(newTd("", false));
    }

    if (currentTable.percentageDifferences.length >= 1) {
        const medianPercentage = calculateMedian(currentTable.percentageDifferences);
        const tdText = `${medianPercentage > 0 ? "+" : ""}${medianPercentage.toFixed(3)}%`;
        let tdColour = medianPercentage > 0 ? "#85FF78" : "#FF7878";
        
        tr2.appendChild(newTd(tdText, true, { 
            backgroundColor: tdColour,
            colSpan: 4
        }));
    }

    displayQualyScore(currentTable);
}


// Create all qualifying tables

function createQualifyingTable(results) {
    const div = document.getElementById("tables");
    div.innerHTML = "";
    
    let currentTable = undefined;
    let tableList = [];

    const races = results.MRData.RaceTable.Races;
    for(let i = 0; i < races.length; i++) {
        if (races[i].QualifyingResults.length !== 2) continue;

        races[i].QualifyingResults.sort((a,b) => a.number - b.number);

        let driver1Id = races[i].QualifyingResults[0].Driver.driverId;
        let driver2Id = races[i].QualifyingResults[1].Driver.driverId;

        const driver1 = newDriver(driver1Id < driver2Id ? races[i].QualifyingResults[0] : races[i].QualifyingResults[1]);
        const driver2 = newDriver(driver1Id > driver2Id ? races[i].QualifyingResults[0] : races[i].QualifyingResults[1]);

        // Create or find existing table
        if(i === 0) {
            currentTable = createTable(driver1, driver2);
            tableList.push(currentTable);
        } else {
            const newTableId = `${driver1.id}${driver2.id}`;
            currentTable = tableList.find(t => t.id === newTableId);
            
            if(!currentTable) {
                currentTable = createTable(driver1, driver2);
                tableList.push(currentTable);
            }
        }
        
        const tr = document.createElement("tr");
        currentTable.table.appendChild(tr);

        // Add round number
        tr.appendChild(newTd(races[i].round, false, {textAlign: "center"}));
        
        // Add race name
        tr.appendChild(newTd(races[i].raceName, false, {textAlign: "left"}));

        const d1Times = bestTime(driver1);
        const d2Times = bestTime(driver2);
        const comparison = compareDriverTimes(d1Times, d2Times);

        // Add session used
        tr.appendChild(newTd(comparison.sessionUsed || "N/A", false, {textAlign: "center"}));

        // Add driver times
        tr.appendChild(newTd(comparison.d1Time || "N/A", false));
        tr.appendChild(newTd(comparison.d2Time || "N/A", false));

        if (!comparison.sessionUsed || !comparison.d1Time || !comparison.d2Time) {
            tr.appendChild(newTd("No comparable times", false));
            tr.appendChild(newTd("N/A", false));
            continue;
        }

        currentTable.raceCount++;
        
        const d1TimeMs = convertTimeString(comparison.d1Time);
        const d2TimeMs = convertTimeString(comparison.d2Time);
        const timeDifference = d2TimeMs - d1TimeMs;
        const percentageDifference = (timeDifference / d1TimeMs) * 100;

        currentTable.timeDifferences.push(timeDifference);
        currentTable.percentageDifferences.push(percentageDifference);
        currentTable.sameRaceCount++;

        if (timeDifference < 0) {
            currentTable.driver1Better++;
        }

        // Add time delta
        const time = millisecondsToStruct(timeDifference);
        const tdText = `${time.isNegative ? "-" : "+"}${time.minutes > 0 ? time.minutes+":" : ""}${time.seconds}.${time.milliseconds}`;
        const tdColour = time.isNegative ? "#FF7878" : "#85FF78";
        tr.appendChild(newTd(tdText, false, { backgroundColor: tdColour }));

        // Add percentage delta
        const percentText = `${percentageDifference > 0 ? "+" : ""}${percentageDifference.toFixed(3)}%`;
        tr.appendChild(newTd(percentText, false, { backgroundColor: tdColour }));
    }

    // Display summary statistics for each table
    tableList.forEach(table => {
        displayMedianResults(table);
    });
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



