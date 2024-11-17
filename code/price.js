const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const partner = urlParams.get("partner");

const container = document.querySelector('.container');
const preloader = document.querySelector('.c-car-spinner');

function createTable(data) {
  const table = document.getElementById("price-table");
  const thead = table.createTHead();
  const tbody = document.createElement("tbody");

  data.values.forEach((rowData) => {
    const row = tbody.insertRow();

    if (rowData.color) {
      row.classList.add("orange-background");
      const cellName = row.insertCell();
      cellName.colSpan = 4;
      cellName.textContent = rowData.name;
    } else {
      const { i, name, price } = rowData;
      const cells = [i, name, price];

      cells.forEach((cellData) => {
        const cell = row.insertCell();
        if (!isNaN(cellData)) {
          cell.classList.add("number-cell");
        }
        cell.textContent = cellData;
      });
    }
  });

  // Create table headers
  const headerRow = thead.insertRow();
  data.header_row.forEach((headerText) => {
    const th = document.createElement("th");
    th.style.position = "sticky";
    th.style.top = "0";
    th.textContent = headerText;
    headerRow.appendChild(th);
  });

  table.appendChild(tbody);
}

async function fetchData() {
  try {
    const response = await fetch(`/get-price?partner=${partner}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const { data } = await response.json();
    createTable(data);
  } catch (error) {
    console.error("Error fetching data:", error.stack);
  }
}

async function preload() {
  await fetchData();
  preloader.style.display = "none";
  container.style.display = "flex";
}

preload();
