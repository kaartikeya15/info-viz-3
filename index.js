// Set dimensions and margins for the chart
const margin = { top: 20, right: 80, bottom: 60, left: 80 };
const width = 1200 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let selectedCountries = []; // Global array to keep track of selected countries

// Append SVG element
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip setup
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden");

let globalData, minTimestamp, maxTimestamp;

// Populate the country checkboxes with search functionality
function populateCountryCheckboxes(data) {
    const countries = Array.from(new Set(data.map(d => d.Country))).sort();
    const checkboxContainer = d3.select("#country-checkboxes");
    const searchBox = d3.select("#country-search");

    // Function to update checkboxes based on filtered countries
    function updateCheckboxes(filteredCountries) {
        checkboxContainer.selectAll("label").remove();

        // Add checkboxes for each filtered country
        filteredCountries.forEach(country => {
            const label = checkboxContainer.append("label")
                .attr("class", "country-checkbox-label");

            // Create checkbox and retain checked state from global `selectedCountries`
            const checkbox = label.append("input")
                .attr("type", "checkbox")
                .attr("value", country)
                .attr("class", "country-checkbox")
                .property("checked", selectedCountries.includes(country)) // Retain global checked state
                .on("change", function() {
                    if (this.checked) {
                        // Add country to `selectedCountries` if checked
                        selectedCountries.push(country);
                    } else {
                        // Remove country from `selectedCountries` if unchecked
                        selectedCountries = selectedCountries.filter(c => c !== country);
                    }
                    updateChart(); // Update chart based on global `selectedCountries`
                });

            label.append("span").text(country);
        });
    }

    // Initial population of checkboxes with all countries
    updateCheckboxes(countries);

    // Search functionality
    searchBox.on("input", function() {
        const searchText = this.value.toLowerCase();
        const filteredCountries = countries.filter(country =>
            country.toLowerCase().includes(searchText)
        );
        updateCheckboxes(filteredCountries);
    });
}

// Load and parse data, then initialize chart elements
d3.csv("covid.csv").then(data => {
    // Parse date and convert values to numbers
    data.forEach(d => {
        d.Date_reported = d3.timeParse("%Y-%m-%d")(d.Date_reported);
        d.Cumulative_cases = +d.Cumulative_cases;
        d.Cumulative_deaths = +d.Cumulative_deaths;
    });

    globalData = data; // Store data globally for use in updateChart

    // Populate country checkboxes with search functionality
    populateCountryCheckboxes(data);

    // Determine date range for sliders
    const minDate = d3.min(data, d => d.Date_reported);
    const maxDate = d3.max(data, d => d.Date_reported);
    minTimestamp = minDate.getTime();
    maxTimestamp = maxDate.getTime();

    // Configure sliders
    d3.select("#start-date-slider")
        .attr("min", minTimestamp)
        .attr("max", maxTimestamp)
        .attr("value", minTimestamp)
        .on("input", updateChart);

    d3.select("#end-date-slider")
        .attr("min", minTimestamp)
        .attr("max", maxTimestamp)
        .attr("value", maxTimestamp)
        .on("input", updateChart);

    // Set initial date labels
    d3.select("#start-date-label").text(d3.timeFormat("%Y-%m-%d")(minDate));
    d3.select("#end-date-label").text(d3.timeFormat("%Y-%m-%d")(maxDate));

    // Initial chart rendering
    updateChart();
});

// Color scale for multiple countries
const color = d3.scaleOrdinal(d3.schemeCategory10);

// Update chart based on selected countries and date range
function updateChart() {
    // Parse the start and end dates from the sliders
    const startDate = new Date(+d3.select("#start-date-slider").node().value);
    const endDate = new Date(+d3.select("#end-date-slider").node().value);

    // Update the date labels to reflect the current slider values
    d3.select("#start-date-label").text(d3.timeFormat("%Y-%m-%d")(startDate));
    d3.select("#end-date-label").text(d3.timeFormat("%Y-%m-%d")(endDate));

    // Filter the data based on selected countries and date range
    const filteredData = globalData.filter(d => 
        selectedCountries.includes(d.Country) && 
        d.Date_reported >= startDate && 
        d.Date_reported <= endDate
    );

    // Clear previous chart elements to prepare for a fresh render
    svg.selectAll("*").remove();

    // Display a message if no data is available for the selected criteria
    if (filteredData.length === 0) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .text("No data available for the selected criteria.")
            .style("fill", "#888")
            .style("font-size", "1.5em");
        return;
    }

    // Set up the scales
    const x = d3.scaleTime()
        .domain([startDate, endDate])
        .range([0, width]);

    const yCases = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.Cumulative_cases)])
        .range([height, 0]);

    const yDeaths = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.Cumulative_deaths)])
        .range([height, 0]);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)")
        .style("stroke-width", "3");

    // Add Y axis for cumulative cases (left)
    svg.append("g")
        .call(d3.axisLeft(yCases))
        .append("text")
        .attr("x", -margin.left)
        .attr("y", -10)
        .attr("fill", "steelblue")
        .attr("text-anchor", "start")
        .text("Cumulative Cases")
        .style("font-size", "14px")
        .style("font-weight", "bold");  

    // Add Y axis for cumulative deaths (right)
    svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yDeaths))
        .append("text")
        .attr("x", margin.right)
        .attr("y", -10)
        .attr("fill", "red")
        .attr("text-anchor", "end")
        .text("Cumulative Deaths")
        .style("font-size", "14px")
        .style("font-weight", "bold");
        
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 1) // Position below the chart
            .attr("text-anchor", "middle")
            .style("font-size", "18px")  // Larger font for title
            .style("font-weight", "bold")
            .text("COVID-19 Cumulative Cases and Deaths Over Time");

    // Draw lines for each selected country in `selectedCountries`
    selectedCountries.forEach((country) => {
        const countryData = filteredData.filter(d => d.Country === country);
        const countryColor = color(country);

        // Line for cumulative cases
        svg.append("path")
            .datum(countryData)
            .attr("fill", "none")
            .attr("stroke", countryColor)
            .attr("stroke-width", 3)
            .attr("d", d3.line()
                .x(d => x(d.Date_reported))
                .y(d => yCases(d.Cumulative_cases))
            );

        // Line for cumulative deaths (dashed)
        svg.append("path")
            .datum(countryData)
            .attr("fill", "none")
            .attr("stroke", d3.rgb(countryColor).darker())
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "5,5")
            .attr("d", d3.line()
                .x(d => x(d.Date_reported))
                .y(d => yDeaths(d.Cumulative_deaths))
            );

        // Add circles and tooltips for cases and deaths
        ["Cumulative_cases", "Cumulative_deaths"].forEach(metric => {
            const metricColor = metric === "Cumulative_cases" ? countryColor : d3.rgb(countryColor).darker();
            svg.selectAll(`.dot-${metric}-${country}`)
                .data(countryData)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.Date_reported))
                .attr("cy", d => metric === "Cumulative_cases" ? yCases(d[metric]) : yDeaths(d[metric]))
                .attr("r", 3)
                .attr("fill", metricColor)
                .on("mouseover", (event, d) => {
                    tooltip.style("visibility", "visible")
                        .html(`<strong>Country:</strong> ${country}<br>
                               <strong>Date:</strong> ${d3.timeFormat("%Y-%m-%d")(d.Date_reported)}<br>
                               <strong>${metric.replace('_', ' ')}:</strong> ${d[metric].toLocaleString()}`);
                })
                .on("mousemove", (event) => {
                    tooltip.style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("visibility", "hidden");
                });
        });
    });
}