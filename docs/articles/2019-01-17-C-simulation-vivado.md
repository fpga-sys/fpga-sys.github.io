---
title: Методика работы с Си модулями в симуляции стандартными средствами Vivado
type: article
date: 2019-01-17
author: xakstreet
categories:
  - article
  - DPI
  - Vivado
---

# Методика работы с Си модулями в симуляции стандартными средствами Vivado

**Автор**: xakstreet

> Статья была обновлена до версии Vivado 2023.1

Vivado и SystemVerilog позволяют разработчику использовать модули, написанные на Си. Данный метод называется DPI (Direct Programming Interface). Данная возможность имеет ряд преимуществ:

В определенных случаях удобнее писать тестбэнч на Си в целях экономии времени
Если уже есть код на Си, можно его подключить, не переписывая все для симуляции (Это как раз было основной причиной для меня, изучить DPI. В моем случае данные из ПЛИС передаются на компьютер для дальнейшей обработки и что бы просимулировать обработку внутри ПЛИС с обработкой на компьютере одновременно, мне нужно использовать этот метод)
Разберем простейший пример.

В документе ug900 рассмотрен пример использования DPI. Для простоты возьмем его.

1. Создаем проект с именем `C_tst_prj`
- Открываем **Vivado**
- Нажимаем **Create Project**

![alt_text](2019-01-17-C-simulation-vivado-assets/fig1.png)

- В открывшемся окне нажимаем **Next**
-  Выбираем директорию проекта и вводим его название

![alt_text](2019-01-17-C-simulation-vivado-assets/fig2.png)

- Выбираем rtl-проект, ставим галку в указанном поле

![alt_text](2019-01-17-C-simulation-vivado-assets/fig3.png)

- Выбираем любую плату – это для нас не важно, так как работа будет производиться исключительно в режиме симуляции.
- Нажимаем **Finish**

2. В папке проекта создаем папку для исходников src
3. В папке src создаем 3 следующих файла:

```c
//function1.c

int myFunction1()
{
    return 5;
}
```
```c
//function2.c

#include <stdio.h>

int myFunction2()
{
    return 10;
}
```
```verilog
//file.sv

module m();
    import "DPI-C" pure function int myFunction1 ();
    import "DPI-C" pure function int myFunction2 ();
    integer i, j;
    initial
    begin
        #1;
        i = myFunction1();
        j = myFunction2();
        $display(i, j);
        if( i == 5 && j == 10)
            $display("PASSED");
        else
            $display("FAILED");
    end
endmodule
```

4. Добавляем file.sv в пустой проект в Vivado(**File**->**Add source**->**Add or create simulation sources**->**Add**, убираем галочку с _Copy sources into project_, **Finish**)


## Простейший способ запуска симуляции этого проекта команды из консоли

1. В tcl консоли переходим в папку с исходниками (в моем случает это:`cd C:/Vivado16_1_Projects/C_tst_prj/src/`)

2. Выполняем следующие команды:
```tcl
exec xsc function1.c function2.c
```
Генерируется _.so_-файл и подлинковывается к проекту (если у вас линукс, если windows, то расширение будет _.a_)

Видим результат исполнения команды:
```shell
Multi-threading is on. Using 6 slave threads.
Running compilation flowC:\Xilinx\Vivado\2023.1\data\..\tps\mingw\6.2.0\win64.o\nt\bin\gcc.exe  -fPIC -c -Wa,-W    -I"C:\Xilinx\Vivado\2023.1\data/xsim/include" -I"C:\Xilinx\Vivado\2023.1\data/xsim/systemc" "function1.c" -o "xsim.dir/work\xsc\function1.win64.obj" -DXILINX_SIMULATOR -Wno-deprecated-declarations 
C:\Xilinx\Vivado\2023.1\data\..\tps\mingw\6.2.0\win64.o\nt\bin\gcc.exe  -fPIC -c -Wa,-W    -I"C:\Xilinx\Vivado\2023.1\data/xsim/include" -I"C:\Xilinx\Vivado\2023.1\data/xsim/systemc" "function2.c" -o "xsim.dir/work\xsc\function2.win64.obj" -DXILINX_SIMULATOR -Wno-deprecated-declarations 
Done compilation
Linking with command:
C:\Xilinx\Vivado\2023.1\data\..\tps\mingw\6.2.0\win64.o\nt\bin\ar.exe rcs "xsim.dir/work\xsc\dpi.a" "xsim.dir/work\xsc\function1.win64.obj" "xsim.dir/work\xsc\function2.win64.obj"   

Done linking: "xsim.dir/work\xsc\dpi.a"
```
`exec xelab -svlog file.sv -sv_lib dpi -debug typical` – генерируем снэпшот для симуляции с флагом `-debug` с опцией `typical` чтобы временная диаграма была доступна.

Результат исполнения команды:
```shell
Vivado Simulator v2023.1
Copyright 1986-2022 Xilinx, Inc. All Rights Reserved.
Copyright 2022-2023 Advanced Micro Devices, Inc. All Rights Reserved.
Running: C:\Xilinx\Vivado\2023.1\bin\unwrapped\win64.o\xelab.exe -svlog file.sv -sv_lib dpi 
Multi-threading is on. Using 6 slave threads.
INFO: [VRFC 10-2263] Analyzing SystemVerilog file "C:/C_tst_prj/src/file.sv" into library work
INFO: [VRFC 10-311] analyzing module m
Starting static elaboration
Pass Through NonSizing Optimizer
Completed static elaboration
Starting simulation data flow analysis
Completed simulation data flow analysis
Time Resolution for simulation is 1ps
Compiling module work.m
Built simulation snapshot work.m
```


3. Теперь можно запустить симуляцию, воспользуемся штатным xsim, выполняем

```tcl
xsim work.m
```

В открывшемся симуляторе можем добавить сигналы на временую диаграму и нажимаем запуск: как можно видеть в консоли и на временной диаграме симуляция прошла успешно.

![alt_text](2019-01-17-C-simulation-vivado-assets/fig4.png)
 

Усложняя этот пример я столкнулся с некоторыми неудобствами – если проект разрастается и в нем появляются xci файлы, это приводит к тому, что эти самые файлы надо перечислять в проекте симуляции, что для меня было совершенно не удобно, так как необходимо было заменять некоторые ядра и запускать симуляцию заново – не удобно каждый раз менять список подлинковываемых файлов. Соответственно есть более удобный метод, не использующий непосредственно команду `xelab`. В Vivado есть возможность использовать хуки, соответственно этой возможностью я и воспользовался.

Создаем в папке src файл `script.tcl` в котором будет содержаться всего одна строка:
```tcl
exec xsc \<Абсолютный путь к файлу>\function1.c \<Абсолютный путь к файлу>\function2.c
```
*я делал так, но можно привязаться к директории проекта – по желанию

Открывает настройки проекта (**Tools** -> **Settings** -> **Simulation**->**Compilation**) и в настройках симуляции есть поле _xsim.compile.tcl.pre_ в него добавляем ссылку на `script.tcl` – таким образом без лишних манипуляций со стороны разработчика .so библиотека будет подлинковываться при нажатии на кнопку симуляции (в моем случае я заранее перешел в папку src поэтому ссылка выглядит так).

Во вкладке **Elaboration** в поле _xsim.elaborate.xelab.more\_options_ прописываем: `-debug all -sv_lib dpi` – подключение библиотек dpi и включение режима отладки поддерживающего просмотр вэйвформ.

Таким образом теперь симуляцию проекта можно запускать как обычно из gui Vivado, а при необходимость добавить Си файл, его нужно просто вписать в файле скрипта, который запускается хуком.

## Литература

- [UG900: Vivado Design Suite User Guide Logic Simulation](https://docs.amd.com/viewer/book-attachment/CWDJbHSniqgZL8x~oau_hw/dVcDi_bVfplKTAnSAWndsA-CWDJbHSniqgZL8x~oau_hw)

<div id="telegram-comments"></div>

<script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-discussion="fpgasystems_events/3802"
        data-comments-limit="20">
</script>