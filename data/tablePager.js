/* =====================================
   TABLE PAGER
   Shared Prev / page numbers / Next control with a rows-per-page picker.
   The table keeps its full row list (already sorted) and asks the pager
   for the slice to draw, so paging never changes the order or numbering.

   const pager = createTablePager({
     mountId: "studentsPager",   // empty element the control is drawn into
     noun: "student",            // "Showing 1–25 of 80 students"
     pageSize: 25,
     onChange: redrawTable       // called after the page or page size changes
   });

   const { rows, offset } = pager.slice(allRows);  // draw rows; S/N = offset + i + 1
   pager.reset();                                  // new search/filter: back to page 1
===================================== */
const TABLE_PAGER_SIZES = [10, 25, 50, 100];

window.createTablePager = function ({ mountId, noun = "row", pageSize = 25, onChange }) {
  const mount = document.getElementById(mountId);

  let currentPage = 1;
  // 0 means "All"
  let size = pageSize;

  if (mount) {
    mount.classList.add("table-pager");
    mount.setAttribute("aria-label", `${noun} list pages`);
    mount.innerHTML = `
      <p class="table-pager-info" aria-live="polite"></p>
      <div class="table-pager-buttons"></div>
      <label class="table-pager-size">
        Rows per page
        <select>
          ${TABLE_PAGER_SIZES.map((n) => `<option value="${n}"${n === size ? " selected" : ""}>${n}</option>`).join("")}
          <option value="0">All</option>
        </select>
      </label>
    `;

    mount.querySelector(".table-pager-buttons").addEventListener("click", (e) => {
      const btn = e.target.closest(".table-pager-btn");
      if (!btn || btn.disabled) return;

      currentPage = Number(btn.dataset.page);
      onChange?.();
    });

    mount.querySelector("select").addEventListener("change", (e) => {
      // keep the first row of the current page in view
      const firstRow = size ? (currentPage - 1) * size : 0;

      size = Number(e.target.value) || 0;
      currentPage = size ? Math.floor(firstRow / size) + 1 : 1;
      onChange?.();
    });

    mount.hidden = true;
  }

  function pageCountFor(total) {
    return size ? Math.max(1, Math.ceil(total / size)) : 1;
  }

  // always the first and last page, the current page and its neighbours,
  // with "…" for the gaps
  function pageNumbers(pageCount) {
    const pages = [];

    for (let page = 1; page <= pageCount; page++) {
      if (page === 1 || page === pageCount || Math.abs(page - currentPage) <= 1) {
        if (pages.length && page - pages[pages.length - 1] > 1) pages.push("…");
        pages.push(page);
      }
    }

    return pages;
  }

  function draw(total, pageCount) {
    if (!mount) return;

    // nothing loaded yet, or nothing matched: the table says so itself
    mount.hidden = total === 0;
    if (!total) return;

    const start = size ? (currentPage - 1) * size + 1 : 1;
    const end = size ? Math.min(currentPage * size, total) : total;
    const plural = total === 1 ? noun : `${noun}s`;

    mount.querySelector(".table-pager-info").textContent =
      `Showing ${start}–${end} of ${total} ${plural}`;

    const numbers = pageNumbers(pageCount)
      .map((page) => page === "…"
        ? `<span class="table-pager-gap">…</span>`
        : `<button type="button" class="table-pager-btn${page === currentPage ? " active" : ""}"
            data-page="${page}" aria-label="Page ${page}"
            ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`)
      .join("");

    mount.querySelector(".table-pager-buttons").innerHTML = `
      <button type="button" class="table-pager-btn" data-page="${currentPage - 1}"
        aria-label="Previous page" ${currentPage <= 1 ? "disabled" : ""}>
        <i class="fa-solid fa-chevron-left"></i></button>
      ${numbers}
      <button type="button" class="table-pager-btn" data-page="${currentPage + 1}"
        aria-label="Next page" ${currentPage >= pageCount ? "disabled" : ""}>
        <i class="fa-solid fa-chevron-right"></i></button>
    `;
  }

  return {
    slice(allRows) {
      const total = allRows.length;
      const pageCount = pageCountFor(total);

      // a delete or a smaller result can leave the current page empty
      currentPage = Math.min(Math.max(1, currentPage), pageCount);

      const offset = size ? (currentPage - 1) * size : 0;
      draw(total, pageCount);

      return {
        rows: size ? allRows.slice(offset, offset + size) : allRows,
        offset
      };
    },

    reset() {
      currentPage = 1;
    }
  };
};
