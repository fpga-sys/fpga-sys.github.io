(() => {
  "use strict";

  const VENDOR_FAMILIES = {
    Xilinx: [
      "Spartan-6",
      "Artix-7",
      "Kintex-7",
      "Virtex-7",
      "UltraScale",
      "UltraScale+",
      "MPSoC",
      "RFSoC",
      "Versal"
    ],

    Altera: [
      "MAX",
      "Cyclone",
      "Arria",
      "Stratix",
      "Agilex"
    ],

    Gowin: [
      "GW5A",
      "GW5AR",
      "GW5AS",
      "GW5AT",
      "GW5AST"
    ]
  };

  const YES_NO_VALUES = {
    "": "Все",
    "true": "Да",
    "false": "Нет"
  };

  const VIDEO_VALUES = {
    "": "Все",
    "VGA": "VGA",
    "HDMI": "HDMI",
    "DisplayPort": "DisplayPort",
    "__none__": "Нет"
  };

  const USB_VALUES = {
    "": "Все",
    "USB2.0": "USB 2.0",
    "USB3.0": "USB 3.0",
    "__none__": "Нет"
  };

  const SD_CARD_VALUES = {
    "": "Все",
    "SD-card": "SD-card",
    "microSD-card": "microSD-card",
    "__none__": "Нет"
  };

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function createToolbar(tableElement) {
    const toolbar = document.createElement("div");
    toolbar.className = "boards-toolbar";

    toolbar.innerHTML = `
      <label class="boards-toolbar__field boards-toolbar__field--search">
        <span>Поиск</span>
        <input
          id="boards-search"
          type="search"
          placeholder="Название, вендор, семейство..."
          autocomplete="off"
        >
      </label>

      <label class="boards-toolbar__field">
        <span>Вендор FPGA</span>
        <select id="boards-vendor-filter">
          <option value="">Все</option>
          <option value="Xilinx">Xilinx</option>
          <option value="Altera">Altera</option>
          <option value="Gowin">Gowin</option>
          <option value="Другой">Другой</option>
        </select>
      </label>

      <label class="boards-toolbar__field">
        <span>Семейство ПЛИС</span>
        <select id="boards-family-filter">
          <option value="">Все</option>
        </select>
      </label>

      <button
        id="boards-reset-filters"
        type="button"
        class="md-button boards-toolbar__reset"
      >
        Сбросить фильтры
      </button>
    `;

    tableElement.before(toolbar);

    return {
      toolbar,
      search: toolbar.querySelector("#boards-search"),
      vendor: toolbar.querySelector("#boards-vendor-filter"),
      family: toolbar.querySelector("#boards-family-filter"),
      reset: toolbar.querySelector("#boards-reset-filters")
    };
  }

  function nameFormatter(cell) {
    const row = cell.getRow().getData();
    const name = String(cell.getValue() ?? "");
    const page = row.page;

    if (!page) {
      return document.createTextNode(name);
    }

    const link = document.createElement("a");
    link.href = page;
    link.textContent = name;

    return link;
  }

  function vendorFormatter(cell) {
    const row = cell.getRow().getData();

    if (
      row.fpga_vendor === "Другой" &&
      row.fpga_vendor_details
    ) {
      return row.fpga_vendor_details;
    }

    return row.fpga_vendor || "";
  }

  function yesNoFormatter(cell) {
    return cell.getValue() === true ? "Да" : "Нет";
  }

  function arrayFormatter(cell) {
    const values = cell.getValue();

    if (!Array.isArray(values) || values.length === 0) {
      return "Нет";
    }

    return values.join(", ");
  }

  function arrayHeaderFilter(headerValue, rowValue) {
    if (!headerValue) {
      return true;
    }

    const values = Array.isArray(rowValue) ? rowValue : [];

    if (headerValue === "__none__") {
      return values.length === 0;
    }

    return values.includes(headerValue);
  }

  function booleanHeaderFilter(headerValue, rowValue) {
    if (
      headerValue === "" ||
      headerValue === null ||
      headerValue === undefined
    ) {
      return true;
    }

    return String(rowValue) === String(headerValue);
  }

  function shopsFormatter(cell) {
    const shops = Array.isArray(cell.getValue())
      ? cell.getValue()
      : [];

    if (shops.length === 0) {
      return "—";
    }

    const container = document.createElement("span");
    container.className = "boards-shop-links";

    shops.forEach((shop) => {
      if (!shop || !shop.url) {
        return;
      }

      if (container.childNodes.length > 0) {
        container.appendChild(document.createTextNode(" · "));
      }

      const link = document.createElement("a");
      link.href = shop.url;
      link.textContent = shop.name || "Магазин";
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      container.appendChild(link);
    });

    return container.childNodes.length > 0
      ? container
      : "—";
  }

  function getOtherFamilies(data) {
    return data
      .filter((row) => row.fpga_vendor === "Другой")
      .map((row) => row.fpga_family)
      .filter(Boolean);
  }

  function getFamiliesForVendor(data, vendor) {
    if (vendor && VENDOR_FAMILIES[vendor]) {
      return [...VENDOR_FAMILIES[vendor]];
    }

    if (vendor === "Другой") {
      return getOtherFamilies(data);
    }

    return [
      ...Object.values(VENDOR_FAMILIES).flat(),
      ...getOtherFamilies(data),
      ...data.map((row) => row.fpga_family).filter(Boolean)
    ];
  }

  function updateFamilySelect(data, controls) {
    const selectedVendor = controls.vendor.value;
    const previousFamily = controls.family.value;

    const families = [
      ...new Set(getFamiliesForVendor(data, selectedVendor))
    ].sort((a, b) => a.localeCompare(b, "ru"));

    controls.family.replaceChildren(
      createOption("", "Все"),
      ...families.map((family) => createOption(family, family))
    );

    controls.family.value = families.includes(previousFamily)
      ? previousFamily
      : "";
  }

  function rowContainsSearchText(row, query) {
    if (!query) {
      return true;
    }

    const searchableValues = [
      row.name,
      row.fpga_vendor,
      row.fpga_vendor_details,
      row.fpga_family,

      ...(Array.isArray(row.video) ? row.video : []),
      ...(Array.isArray(row.usb) ? row.usb : []),
      ...(Array.isArray(row.sd_card) ? row.sd_card : []),

      ...(Array.isArray(row.shops)
        ? row.shops.flatMap((shop) => [
            shop?.name,
            shop?.url
          ])
        : [])
    ];

    return searchableValues
      .filter((value) => value !== null && value !== undefined)
      .some((value) =>
        String(value)
          .toLocaleLowerCase("ru")
          .includes(query)
      );
  }

  function applyToolbarFilters(table, controls) {
    const query = controls.search.value
      .trim()
      .toLocaleLowerCase("ru");

    const vendor = controls.vendor.value;
    const family = controls.family.value;

    table.setFilter((row) => {
      if (vendor && row.fpga_vendor !== vendor) {
        return false;
      }

      if (family && row.fpga_family !== family) {
        return false;
      }

      return rowContainsSearchText(row, query);
    });
  }

  function initializeBoardsTable() {
    const tableElement = document.getElementById("boards-table");

    if (!tableElement) {
      return;
    }

    if (tableElement.dataset.initialized === "true") {
      return;
    }

    if (typeof Tabulator === "undefined") {
      console.error(
        "Tabulator не загружен. Проверьте extra_javascript в mkdocs.yml."
      );
      return;
    }

    tableElement.dataset.initialized = "true";

    const controls = createToolbar(tableElement);

    const dataSource =
      tableElement.dataset.source ||
      "/assets/data/boards.json";

    const table = new Tabulator(tableElement, {
      ajaxURL: dataSource,

      layout: "fitColumns",

      responsiveLayout: "collapse",
      responsiveLayoutCollapseStartOpen: false,

      pagination: true,
      paginationSize: 20,
      paginationSizeSelector: [10, 20, 50, 100],

      placeholder: "В базе пока нет плат",
      placeholderHeaderFilter:
        "Нет плат, соответствующих выбранным фильтрам",

      initialSort: [
        {
          column: "name",
          dir: "asc"
        }
      ],

      columns: [
        {
          formatter: "responsiveCollapse",
          width: 42,
          minWidth: 42,
          maxWidth: 42,
          headerSort: false,
          resizable: false,
          frozen: true,
          hozAlign: "center",
          responsive: 0
        },
        {
          title: "Фото",
          field: "image",
          formatter: imageFormatter,
          headerSort: false,
          headerFilter: false,
          width: 110,
          minWidth: 90,
          maxWidth: 130,
          hozAlign: "center",
          vertAlign: "middle",
          responsive: 4
        },
        {
          title: "Наименование",
          field: "name",
          formatter: nameFormatter,
          headerFilter: "input",
          frozen: true,
          minWidth: 170,
          widthGrow: 2,
          responsive: 0
        },

        {
          title: "Вендор FPGA",
          field: "fpga_vendor",
          formatter: vendorFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: {
              "": "Все",
              "Xilinx": "Xilinx",
              "Altera": "Altera",
              "Gowin": "Gowin",
              "Другой": "Другой"
            },
            clearable: true
          },
          minWidth: 125,
          widthGrow: 1,
          responsive: 0
        },

        {
          title: "Семейство ПЛИС",
          field: "fpga_family",
          headerFilter: "input",
          minWidth: 145,
          widthGrow: 1,
          responsive: 0
        },

        {
          title: "DDR/SDRAM",
          field: "ddr_sdram",
          formatter: yesNoFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: YES_NO_VALUES,
            clearable: true
          },
          headerFilterFunc: booleanHeaderFilter,
          hozAlign: "center",
          headerHozAlign: "center",
          minWidth: 115,
          widthGrow: 1,
          responsive: 1
        },

        {
          title: "Ethernet",
          field: "ethernet",
          formatter: yesNoFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: YES_NO_VALUES,
            clearable: true
          },
          headerFilterFunc: booleanHeaderFilter,
          hozAlign: "center",
          headerHozAlign: "center",
          minWidth: 105,
          widthGrow: 1,
          responsive: 2
        },

        {
          title: "Видеовывод",
          field: "video",
          formatter: arrayFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: VIDEO_VALUES,
            clearable: true
          },
          headerFilterFunc: arrayHeaderFilter,
          minWidth: 125,
          responsive: 3
        },

        {
          title: "USB",
          field: "usb",
          formatter: arrayFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: USB_VALUES,
            clearable: true
          },
          headerFilterFunc: arrayHeaderFilter,
          minWidth: 105,
          responsive: 4
        },

        {
          title: "Встроенный программатор",
          field: "programmer",
          formatter: yesNoFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: YES_NO_VALUES,
            clearable: true
          },
          headerFilterFunc: booleanHeaderFilter,
          hozAlign: "center",
          headerHozAlign: "center",
          minWidth: 180,
          responsive: 5
        },

        {
          title: "UART",
          field: "uart",
          formatter: yesNoFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: YES_NO_VALUES,
            clearable: true
          },
          headerFilterFunc: booleanHeaderFilter,
          hozAlign: "center",
          headerHozAlign: "center",
          minWidth: 90,
          responsive: 6
        },

        {
          title: "SD-card слот",
          field: "sd_card",
          formatter: arrayFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: SD_CARD_VALUES,
            clearable: true
          },
          headerFilterFunc: arrayHeaderFilter,
          minWidth: 135,
          responsive: 7
        },

        {
          title: "GPIO/Pmod",
          field: "gpio_pmod",
          formatter: yesNoFormatter,
          headerFilter: "list",
          headerFilterParams: {
            values: YES_NO_VALUES,
            clearable: true
          },
          headerFilterFunc: booleanHeaderFilter,
          hozAlign: "center",
          headerHozAlign: "center",
          minWidth: 115,
          responsive: 8
        },

        {
          title: "Ссылка на магазин",
          field: "shops",
          formatter: shopsFormatter,
          headerSort: false,
          minWidth: 150,
          responsive: 9
        }
      ]
    });

    table.on("dataLoaded", (data) => {
      updateFamilySelect(data, controls);
      applyToolbarFilters(table, controls);
    });

    controls.search.addEventListener("input", () => {
      applyToolbarFilters(table, controls);
    });

    controls.vendor.addEventListener("change", () => {
      updateFamilySelect(table.getData(), controls);
      applyToolbarFilters(table, controls);
    });

    controls.family.addEventListener("change", () => {
      applyToolbarFilters(table, controls);
    });

    controls.reset.addEventListener("click", () => {
      controls.search.value = "";
      controls.vendor.value = "";
      controls.family.value = "";

      updateFamilySelect(table.getData(), controls);

      table.clearHeaderFilter();
      applyToolbarFilters(table, controls);
    });
  }

  document.addEventListener(
    "DOMContentLoaded",
    initializeBoardsTable
  );

  if (typeof document$ !== "undefined") {
    document$.subscribe(initializeBoardsTable);
  }
})();

function imageFormatter(cell) {
  const row = cell.getRow().getData();
  const imageUrl = cell.getValue();

  if (!imageUrl) {
    return "—";
  }

  const link = document.createElement("a");
  link.href = row.page || imageUrl;
  link.className = "boards-image-link";

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = row.name
    ? `Отладочная плата ${row.name}`
    : "Отладочная плата";
  image.loading = "lazy";
  image.decoding = "async";
  image.className = "boards-table-image";

  link.appendChild(image);

  return link;
}