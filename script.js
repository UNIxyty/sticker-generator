document.addEventListener("DOMContentLoaded", () => {
  const { PDFDocument, rgb } = PDFLib;

  const form = document.getElementById("sticker-form");
  const preview = document.getElementById("preview-container");
  const downloadBtn = document.getElementById("download");

  let latestSticker = null;
  let customFontBytes = null;

  fetch("Sentient-Regular.otf")
    .then((res) => res.arrayBuffer())
    .then((fontBytes) => {
      customFontBytes = fontBytes;
    })
    .catch(() => {
      alert("Neizdevās ielādēt fontu Sentient.ttf. Pārliecinies, ka fails ir pieejams.");
    });

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
      const imgURL = reader.result;

      const sticker = document.createElement("div");
      sticker.className = "sticker";
      sticker.innerHTML = `
        <img src="${imgURL}">
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

    reader.readAsDataURL(fotoInput.files[0]);
  });

  downloadBtn.addEventListener("click", async () => {
    if (!latestSticker) {
      alert("Lūdzu izveidojiet uzlīmi vispirms!");
      return;
    }
    if (!customFontBytes) {
      alert("Fonts vēl nav ielādēts, mēģiniet vēlreiz pēc brīža.");
      return;
    }

    const imgElem = latestSticker.querySelector("img");
    const vards = latestSticker.querySelectorAll(".main-text")[0].textContent;
    const personasKods = latestSticker.querySelectorAll(".main-text")[1].textContent;
    const amats = latestSticker.querySelectorAll(".main-text")[2].textContent;
    const ligumaNumurs = latestSticker.querySelectorAll(".main-text")[3].textContent;
    const ligumaDatums = latestSticker.querySelectorAll(".main-text")[4].textContent;

    const imgBytes = await fetch(imgElem.src).then((res) => res.arrayBuffer());

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(customFontBytes);

    const pageWidth = 137;
    const pageHeight = 225;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(252 / 255, 204 / 255, 44 / 255),
    });

    let embeddedImage;
    if (imgElem.src.startsWith("data:image/png")) {
      embeddedImage = await pdfDoc.embedPng(imgBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imgBytes);
    }

    const containerWidth = 80;
    const containerHeight = 100;
    const containerX = (pageWidth - containerWidth) / 2;
    const containerY = pageHeight - containerHeight - 8;

    const imgDims = embeddedImage.scale(1);
    const imgRatio = imgDims.width / imgDims.height;
    const containerRatio = containerWidth / containerHeight;

    let drawWidth, drawHeight;
    if (imgRatio > containerRatio) {
      drawHeight = containerHeight;
      drawWidth = imgDims.width * (containerHeight / imgDims.height);
    } else {
      drawWidth = containerWidth;
      drawHeight = imgDims.height * (containerWidth / imgDims.width);
    }

    const offsetX = containerX - (drawWidth - containerWidth) / 2;
    const offsetY = containerY - (drawHeight - containerHeight) / 2;

    page.drawImage(embeddedImage, {
      x: offsetX,
      y: offsetY,
      width: drawWidth,
      height: drawHeight,
    });

    function drawLine(y) {
      page.drawLine({
        start: { x: 5, y },
        end: { x: pageWidth - 5, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    }

    function drawBlock(mainText, subText, y) {
      const mainSize = 9;
      const subSize = 5;

      const mainTextWidth = customFont.widthOfTextAtSize(mainText, mainSize);
      const mainX = (pageWidth - mainTextWidth) / 2;
      page.drawText(mainText, { x: mainX, y, size: mainSize, font: customFont, color: rgb(0, 0, 0) });

      const lineY = y - 4;
      drawLine(lineY);

      const subTextY = lineY - 6;
      const subTextWidth = customFont.widthOfTextAtSize(subText, subSize);
      const subX = (pageWidth - subTextWidth) / 2;
      page.drawText(subText, { x: subX, y: subTextY, size: subSize, font: customFont, color: rgb(0, 0, 0) });

      let nextY = subTextY - 13.5;
      if (nextY < 10) nextY = 10;
      return nextY;
    }

    let currentY = offsetY - 10;

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
