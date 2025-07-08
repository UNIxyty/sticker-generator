document.addEventListener("DOMContentLoaded", () => {
  const { PDFDocument, rgb } = PDFLib;
  const form = document.getElementById("sticker-form");
  const preview = document.getElementById("preview-container");
  const downloadBtn = document.getElementById("download");

  let latestSticker = null;
  let customFontBytes = null;

  fetch("Sentient-Regular.otf")
    .then(res => res.arrayBuffer())
    .then(fontBytes => customFontBytes = fontBytes)
    .catch(() => alert("Neizdevās ielādēt fontu Sentient.ttf."));

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const vards = document.getElementById("vards").value;
    const personasKods = document.getElementById("personasKods").value;
    const amats = document.getElementById("amats").value;
    const ligumaNumurs = document.getElementById("ligumaNumurs").value;
    const ligumaDatums = document.getElementById("ligumaDatums").value;
    const fotoInput = document.getElementById("foto");

    if (!fotoInput.files[0]) {
      alert("Lūdzu izvēlieties attēlu!");
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 100;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 80, 100);

        const resizedImgURL = canvas.toDataURL("image/png");

        const sticker = document.createElement("div");
        sticker.className = "sticker";
        sticker.innerHTML = `
          <img src="${resizedImgURL}">
          <div class="main-text">${vards}</div>
          <div class="line"></div>
          <div class="sub-text">Vārds, Uzvārds</div>

          <div class="main-text">${personasKods}</div>
          <div class="line"></div>
          <div class="sub-text">Personas kods</div>

          <div class="main-text">${amats}</div>
          <div class="line"></div>
          <div class="sub-text">Amats</div>

          <div class="main-text">${ligumaNumurs}</div>
          <div class="line"></div>
          <div class="sub-text">Darba līguma Nr.</div>

          <div class="main-text">${ligumaDatums}</div>
          <div class="line"></div>
          <div class="sub-text">Darba līguma datums</div>
        `;

        preview.innerHTML = "";
        preview.appendChild(sticker);
        latestSticker = sticker;
        form.reset();
      };
      img.src = reader.result;
    };

    reader.readAsDataURL(fotoInput.files[0]);
  });

  downloadBtn.addEventListener("click", async () => {
    if (!latestSticker) return alert("Lūdzu izveidojiet uzlīmi vispirms!");
    if (!customFontBytes) return alert("Fonts vēl nav ielādēts.");

    const imgElem = latestSticker.querySelector("img");
    const vards = latestSticker.querySelectorAll(".main-text")[0].textContent;
    const personasKods = latestSticker.querySelectorAll(".main-text")[1].textContent;
    const amats = latestSticker.querySelectorAll(".main-text")[2].textContent;
    const ligumaNumurs = latestSticker.querySelectorAll(".main-text")[3].textContent;
    const ligumaDatums = latestSticker.querySelectorAll(".main-text")[4].textContent;

    const imgBytes = await fetch(imgElem.src).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(customFontBytes);

    const pageWidth = 137;
    const pageHeight = 225;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Draw yellow background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(252 / 255, 204 / 255, 44 / 255),
    });

    // Embed image
    const embeddedImage = await pdfDoc.embedPng(imgBytes);
    const imgX = (pageWidth - 80) / 2;
    const imgY = pageHeight - 100 - 8;

    page.drawImage(embeddedImage, {
      x: imgX,
      y: imgY,
      width: 80,
      height: 100,
    });

    // Helper to draw a line
    function drawLine(y) {
      page.drawLine({
        start: { x: 5, y },
        end: { x: pageWidth - 5, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    }

    // Helper to draw text block
    function drawBlock(mainText, subText, y) {
      const mainSize = 9;
      const subSize = 5;

      const mainX = (pageWidth - customFont.widthOfTextAtSize(mainText, mainSize)) / 2;
      page.drawText(mainText, { x: mainX, y, size: mainSize, font: customFont, color: rgb(0, 0, 0) });

      const lineY = y - 4;
      drawLine(lineY);

      const subY = lineY - 6;
      const subX = (pageWidth - customFont.widthOfTextAtSize(subText, subSize)) / 2;
      page.drawText(subText, { x: subX, y: subY, size: subSize, font: customFont, color: rgb(0, 0, 0) });

      return subY - 13.5;
    }

    // Draw blocks
    let currentY = imgY - 10;
    currentY = drawBlock(vards, "Vārds, Uzvārds", currentY);
    currentY = drawBlock(personasKods, "Personas kods", currentY);
    currentY = drawBlock(amats, "Amats", currentY);
    currentY = drawBlock(ligumaNumurs, "Darba līguma Nr.", currentY);
    currentY = drawBlock(ligumaDatums, "Darba līguma datums", currentY);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "uzlime.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
  });
});
