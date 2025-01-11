
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
    
    // Create a container div for this specific table
    const tableContainer = document.createElement("div");
    tableContainer.style.display = "block"; // Force block layout
    tableContainer.style.marginBottom = "2em";
    tableContainer.style.width = "fit-content";
    
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "fit-content";
    table.style.marginBottom = "1em";
    table.style.backgroundColor = "#f5f5f5";  // Light grey background
    
    const tr = document.createElement("tr");
    table.appendChild(tr);

    // Add headers with specific widths and styles
    const headers = [
        { text: "Round", width: "40px" },
        { text: "Race", width: "180px" },
        { text: "Session", width: "50px" },
        { text: driver1.name, width: "100px" },
        { text: driver2.name, width: "100px" },
        { text: "Time Delta", width: "90px" },
        { text: "Delta %", width: "80px" }
    ];

    // Calculate total width for table
    const totalWidth = headers.reduce((sum, header) => sum + parseInt(header.width), 0);
    tableContainer.style.width = `${totalWidth}px`; // Set container width to match table

    headers.forEach((header, index) => {
        let th = document.createElement("th");
        th.appendChild(document.createTextNode(header.text));
        th.className = `row-${index + 1}`;
        th.style.padding = "4px";
        th.style.textAlign = index === 1 ? "left" : "center";
        th.style.width = header.width;
        th.style.whiteSpace = "nowrap"; // Prevent header text wrapping
        tr.appendChild(th);
    });

    tableContainer.appendChild(table);
    div.appendChild(tableContainer);
    
    return {
        table: table,
        id: `${driver1.id}${driver2.id}`,
        sameRaceCount: 0,
        raceCount: 0,
        timeDifferences: [],
        percentageDifferences: [],
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
    // Calculate averages
    const calculateAverage = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    
    const summaryData = [
        {
            label: "Average time difference",
            getValue: () => {
                if (currentTable.timeDifferences.length >= 1) {
                    const avgTime = millisecondsToStruct(calculateAverage(currentTable.timeDifferences));
                    const ms = avgTime.milliseconds.toString().padStart(3, '0');
                    return {
                        text: `${avgTime.isNegative ? "-" : "+"}${avgTime.minutes > 0 ? avgTime.minutes + ":" : ""}${avgTime.seconds}.${ms}`,
                        color: avgTime.isNegative ? "#FF7878" : "#85FF78"
                    };
                }
                return null;
            }
        },
        {
            label: "Median time difference",
            getValue: () => {
                if (currentTable.timeDifferences.length >= 1) {
                    const medianTime = millisecondsToStruct(calculateMedian(currentTable.timeDifferences));
                    const ms = medianTime.milliseconds.toString().padStart(3, '0');
                    return {
                        text: `${medianTime.isNegative ? "-" : "+"}${medianTime.minutes > 0 ? medianTime.minutes + ":" : ""}${medianTime.seconds}.${ms}`,
                        color: medianTime.isNegative ? "#FF7878" : "#85FF78"
                    };
                }
                return null;
            }
        },
        {
            label: "Average percentage difference",
            getValue: () => {
                if (currentTable.percentageDifferences.length >= 1) {
                    const avgPercentage = calculateAverage(currentTable.percentageDifferences);
                    const formattedPercentage = Number(Math.abs(avgPercentage)).toPrecision(3);
                    return {
                        text: `${avgPercentage > 0 ? "+" : "-"}${formattedPercentage}%`,
                        color: avgPercentage > 0 ? "#85FF78" : "#FF7878"
                    };
                }
                return null;
            }
        },
        {
            label: "Median percentage difference",
            getValue: () => {
                if (currentTable.percentageDifferences.length >= 1) {
                    const medianPercentage = calculateMedian(currentTable.percentageDifferences);
                    const formattedPercentage = Number(Math.abs(medianPercentage)).toPrecision(3);
                    return {
                        text: `${medianPercentage > 0 ? "+" : "-"}${formattedPercentage}%`,
                        color: medianPercentage > 0 ? "#85FF78" : "#FF7878"
                    };
                }
                return null;
            }
        }
    ];

    summaryData.forEach((data, index) => {
        const tr = document.createElement("tr");
        currentTable.table.appendChild(tr);

        // First cell with label (Round column)
        const labelCell = document.createElement("td");
        labelCell.style.textAlign = "left";
        labelCell.style.padding = "4px";
        labelCell.style.fontWeight = "bold";
        labelCell.style.width = "40px"; // Match Round column width
        if (index === 0) labelCell.style.borderTop = "4px solid #ddd";
        labelCell.textContent = "";
        tr.appendChild(labelCell);

        // Race name column - contains the label
        const raceLabelCell = document.createElement("td");
        raceLabelCell.style.textAlign = "left";
        raceLabelCell.style.padding = "4px";
        raceLabelCell.style.fontWeight = "bold";
        raceLabelCell.style.width = "180px"; // Match Race column width
        if (index === 0) raceLabelCell.style.borderTop = "4px solid #ddd";
        raceLabelCell.textContent = data.label;
        tr.appendChild(raceLabelCell);

        // Session column (empty)
        const sessionCell = document.createElement("td");
        if (index === 0) sessionCell.style.borderTop = "4px solid #ddd";
        sessionCell.style.width = "50px"; // Match Session column width
        tr.appendChild(sessionCell);

        // Value cell spanning remaining columns
        const result = data.getValue();
        const valueCell = document.createElement("td");
        valueCell.style.padding = "4px";
        valueCell.style.textAlign = "center";
        valueCell.colSpan = 4;
        if (index === 0) valueCell.style.borderTop = "4px solid #ddd";
        
        if (result) {
            valueCell.style.backgroundColor = result.color;
            valueCell.style.fontWeight = "bold";
            valueCell.textContent = result.text;
        } else {
            valueCell.textContent = "N/A";
        }
        
        tr.appendChild(valueCell);
    });

    // Add qualifying score with same cell structure
    const qualyScoreTr = document.createElement("tr");
    currentTable.table.appendChild(qualyScoreTr);

    // Round column (empty)
    const roundCell = document.createElement("td");
    roundCell.style.width = "40px";
    qualyScoreTr.appendChild(roundCell);

    // Race column with label
    const labelCell = document.createElement("td");
    labelCell.style.textAlign = "left";
    labelCell.style.padding = "4px";
    labelCell.style.fontWeight = "bold";
    labelCell.style.width = "180px";
    labelCell.textContent = "Qualifying score";
    qualyScoreTr.appendChild(labelCell);

    // Session column (empty)
    const sessionCell = document.createElement("td");
    sessionCell.style.width = "50px";
    qualyScoreTr.appendChild(sessionCell);

    // Score cell
    const scoreCell = document.createElement("td");
    scoreCell.style.padding = "4px";
    scoreCell.style.textAlign = "center";
    scoreCell.style.fontSize = "1.1em";
    scoreCell.style.fontWeight = "bold";
    scoreCell.colSpan = 4;

    const scoreText = `${currentTable.driver1Better} - ${currentTable.raceCount - currentTable.driver1Better}`;
    const scoreBetter = currentTable.driver1Better > (currentTable.raceCount - currentTable.driver1Better);
    const scoreEqual = currentTable.driver1Better === (currentTable.raceCount - currentTable.driver1Better);
    scoreCell.style.backgroundColor = scoreBetter ? "#85FF78" : (scoreEqual ? "#ffc478" : "#FF7878");
    scoreCell.textContent = scoreText;

    qualyScoreTr.appendChild(scoreCell);
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
        tr.style.borderBottom = "1px solid #ddd";
        currentTable.table.appendChild(tr);

        // Add all cells with consistent styling
        const cells = [
            { text: races[i].round, align: "center" },
            { text: races[i].raceName, align: "left" }
        ];

        // Add session and times comparison
        const d1Times = bestTime(driver1);
        const d2Times = bestTime(driver2);
        const comparison = compareDriverTimes(d1Times, d2Times);

        cells.push(
            { text: comparison.sessionUsed || "N/A", align: "center" },
            { text: comparison.d1Time || "N/A", align: "center" },
            { text: comparison.d2Time || "N/A", align: "center" }
        );

        if (!comparison.sessionUsed || !comparison.d1Time || !comparison.d2Time) {
            cells.push(
                { text: "No comparable times", align: "center" },
                { text: "N/A", align: "center" }
            );
        } else {
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

            const time = millisecondsToStruct(timeDifference);
            const tdColor = time.isNegative ? "#FF7878" : "#85FF78";

            cells.push(
                { 
                    text: `${time.isNegative ? "-" : "+"}${time.minutes > 0 ? time.minutes+":" : ""}${time.seconds}.${time.milliseconds}`,
                    align: "center",
                    backgroundColor: tdColor
                },
                { 
                    text: `${percentageDifference > 0 ? "+" : ""}${percentageDifference.toFixed(3)}%`,
                    align: "center",
                    backgroundColor: tdColor
                }
            );
        }

        // Create all cells with consistent styling
        cells.forEach(cellData => {
            const td = document.createElement("td");
            td.textContent = cellData.text;
            td.style.padding = "8px";
            td.style.textAlign = cellData.align;
            if (cellData.backgroundColor) {
                td.style.backgroundColor = cellData.backgroundColor;
            }
            tr.appendChild(td);
        });
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



