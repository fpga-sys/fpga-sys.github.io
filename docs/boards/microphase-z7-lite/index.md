---
title: Microphase z7-Lite
type: board
date: 2026-07-04
author: anton.sosnitzkij
tags:
  - board
  - RFSoC
  - review
---

# Отладочная плата RFSoC ZU27DR Wishcolor 

![board_phbto](./image.jpg)

## О плате

- Ресурсы производителя: [Ref manual](https://fpga-docs.microphase.cn/en/latest/DEV_BOARD/Z7-LITE/Z7-Lite_Reference_Manual.html)
- Мои потуги: [Github](https://github.com/smirnovich/microphase-z7)

На плате установлен чип xc7z020-1clg400c (PS+PL), у многих продавцов доступна версия с xc7z010-1clg400c. На плате стоит программатор с type-C разъемом. Джампером доступно управление последовательностью загрузки на три опции:

- JTAG
- QSPI
- SD

### PS периферия

- USB type-C UART (CH340)
- microSD card slot
- 4Gbit DDR3 MT41J256M16 RE-125
- USB Host 3320C-EZK
- Winbond 16MB QSPI Flash W25Q128JVSIQ
- 1 Key button  ( + PS reset button)
- 1 green LED

### PL периферия
- JTAG (FT232H)
- HDMI Output 
- Ethernet RTL8201F 10/100 с доступными MDC/MDIO
- PL CLK 50 MHz (pin N18)
- 2 Buttons
- 2 green LEDs
- 2 GPIO 2x20 (3.3V)

Так же на выход `FPGA_DONE` подцеплен зеленый светодиод, а красный свтодиод подцеплен на шины `VCC_DDR3` и `VCC_3V3`

### Питание

Плата питается от USB, при этом как от UART так и от отладочного разъема

## 
