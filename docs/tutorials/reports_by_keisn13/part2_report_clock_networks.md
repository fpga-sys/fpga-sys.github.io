---
title: Vivado reprorts => report_clock_networks
description: "Расширенный комментарий по `report_clock_networks`"
date: 2017-11-08
categories:
  - reports
  - Vivado
---


# Vivado reprorts => `report_clock_networks`

## Синтаксис

```tcl 
report_clock_networks [-file <arg>] [-append] [-name <arg>] [-return_string] [-endpoints_only] [-levels <arg>] [-expand_buckets] [-suppress_endpoints <arg>] [-clocks <args>] [-unconstrained_roots <args>] [-quiet] [-verbose]
```

### Возвращаемое значение

Нет
 
### Категории

теги: #Report, #Timing
 
## Описание

Генерирование отчёта о разветвлении тактовой сети. Требуется открытый синтезированный или имплементированный проект. Графическая интерпретация отчёта доступна при использовании опции –name.
По умолчанию будет выведен упрощённый отчёт, в котором будут указаны имена тактовых цепей и пины стартовых точек тактовый сетей.
Отчёт будет отправлен в стандартное устройство вывода, если нет опций `–file`, `-return_string`, `-name`.
 
Аргументы
 

`-file <arg>` - (опционально) Записать отчёт в файл. Если файл существует, он будет перезаписан или же информация будет добавлена в файл, если использована опция `–append`
Примечание: если путь не указан в имени файла, то файл будет записан в текущую рабочую директорию или в директорию, из которой запущена среда.
 
`-append` – (опционально) добавить выходные данные команды в файл, вместо того, что бы его перезаписать.
Примечание: опция –append может быть использована только с опцией `-file`
 
`-name <arg>` - (опционально) задаёт имя отчёта и отображает отчёт в  графическом интерфейсе. Если отчёт c таким именем уже сформирован, то он будет закрыт, а новый будет отображён.
 
`-return_string` – (опционально) Сформировать выход команды в TCL строку, вместо того, что бы отобразить её  в стандартном устройстве ввода/вывода. TCL строка может быть определена как переменная и в последующем обработана.
Примечание: эта опция не моет быть использована совместно с опцией `-file`
 
`-endpoints_only` – (опционально) Включить в отчёт конечные точки тактовой сети.  Конечные точки будут сгруппированы по типу ячейки и сортированы по тактовым пинам. Эта опция не может быть использована совместно с опцией `-levels`
 
`-levels <arg>` - (опционально) Развернуть тактовую сеть на определённое количество уровней. По умолчанию значение `0`. Указываемое количество уровней должно быть больше `0`. Отчёт может содержать полное описание тактовой сети, если указано достаточное количество уровней. Эта опция не может быть использована совместно с опцией `-endpoints_only`
 
`-expand_buckets` – (опционально) Вывести в отчёт развёрнутую тактовую сеть до всех конечных точек, возвращаемых опциями  `-endpoints_only` или `-level`
 
`-suppress_endpoints [ clock | nonclock ]` – (опционально) Позволяет скрыть в отчёте тактовые сети, которые разветвляются к тактовым или не тактовым конечным точкам (см. примеры). 
 
`-clocks <args>` - (опционально) Позволяет сформировать отчёт для определённой тактовой сети. Если опция не указана, то выводится отчёт для всех тактовый сетей.
 
`-unconstrained_roots <args>` - (опционально)  Для кристаллов семейства UltraScale и для кристаллов с поддержкой структуры **clock root** («корень» тактового дерева – центральная точка тактовой сети, см. UG572 UltraScale Architecture Clocking Resources), позволяет определить список пинов или портов «корней» тактового дерева, которые не были покрыты временными ограничениями. Если эта опция отсутствует, то в отчёте будут показаны все «корни» тактового дерева, непокрытые соответствующими временными ограничениями.
 
`-quiet` – (опционально) Команда выполняется в «тихом» режиме, сообщения команды не отображаются. Команда возвращает `TCL_OK` независимо от каких-либо ошибок её выполнения.
Примечание: Если ошибка обнаружена в командной строке при вводе команды, то ошибка будет отображена. Не отображается ошибки, которые появляются во время выполнения команды.
 
`-verbose` – (опционально) Временное переопределение ограничений на количество выводимых сообщений команды.
Примечание: количество выводимых сообщений может регулироваться с помощью команды `set_msg_config`.
 
## Примеры

Рассмотрим модуль, у которого имеется два основных тактовых сигнала   «ipadClock» и «ipadClock_unconstrained»:
```vhdl
entity top is
    port (
        ipadClock : in STD_LOGIC;
        ipadClock_unconstrained: in STD_LOGIC;
        oOut_1: out STD_LOGIC;
        oOut_2: out STD_LOGIC;
        iData_1: in STD_LOGIC;
        iData_2: in STD_LOGIC;
        iData_3: in STD_LOGIC;
    );
end top;
```

Тактовый сигнал `ipadClock`, имеющий частоту 100МГц подключён к MMCM, который генерирует два тактовых сигнала `clk_1`  и `clk_2` c частотами 100МГц и 200МГц соответственно:
 
 ![alt_text](assets2/fig1_mmcm.png)
 ![alt_text](assets2/fig2_mmcm.png)
 
Для тактового входа `ipadClock_unconstrained` не объявлены никакие временные ограничения.

Сигнал `iData_1` c через два промежуточных триггера c тактовым доменом `clk_1` попадает на выход `oOut_1`. Аналогично для `iData_2`. Сигнал `iData_3` в тактовом домене `ipadClock_unconstrained` через триггер подаётся на выход `oOut_3`. Код, реализующий такую структуру:

```vhdl
architecture Behavioral of top is

    component MMCM
    port
    (--Clock in ports
     --Clock out ports
    clk_out1 : out std_logic;
    clk_out2 : out std_logic;

    locked : out std_logic;
    clk_in1 : std_logic
    );
    end component;

    signal clk_1, clk_2 : std_logic :='0';
    signal data_1, data_2 : std_logic :='0';

begin
    Inst_MMCM : MMCM
        port map (
            -- Clock out ports
            clk_out1 => clk_1,
            clk_out2 => clk_2,
            -- Status and control signals
            locked => open,
            clk_in1 => ipadClock
        );
    process(clk_1)
    begin
        if rising_edge(clk_1) then
            data_1 <= iData_1;
            oOut_1 <= data_1;
        end if;
    end process;

    process(clk_2)
    begin
        if rising_edge(clk_1) then
            data_2 <= iData_2;
            oOut_2 <= data_2;
        end if;
    end process;

    process(ipadClock_unconstrained)
    begin
        if rising_edge(ipadClock_unconstrained) then
            oOut_3 <= iData_3;
        end if;
    end process;
end Behavioral;
```
 
1. Выполним синтез. Netlist выглядит следующим образом
 
![alt_text](assets2/fig3_netlist.png)
 
 
2. Запустим `report_clock_networks`:

![alt_text](assets2/fig4_report.png)

Как видим, упрощённый отчёт показывает, что имеется два основных тактовых сигнала, один из которых `ipadClock` покрыт временными ограничениями, заданными в мастере настроек MMCM, второй `ipadClock_unconstrained` не имеет соответствующих ограничений и находится в категории **Unconstrained Clocks**. Тактовый сигнал от `ipadClock` имеет 4 тактовых конечных точки (_endpoints_), которыми является 4 триггера (`data_1_reg`, `oOut_1_reg`, `data_2_reg`, `oOut_2_reg`)  и 1 конечная точка которая не является тактовой (non-clock) – это линия обратной связи блока MMCM (от выхода `CLKFBOUT` до входа `CLKFBIN`).
Для тактового сигнала `ipadClock_unconstrained` имеется всего одна тактовая конечная точка, это `oOut_3_reg`.
 
> Примечание: сигналы из группы «Unconstrained Clocks» должны быть покрыты соответствующими временными ограничениями, в противном случае отчёты, которые требуют информации о тактовой сети, будут сформированы некорректно или не полностью.
 
 

3. Выведем отчёт о конечных точках, сгруппированных по типу конечных точек. Воспользуемся опцией `-endpoints_only`:

`report_clock_networks -endpoints_only`
 
![alt_text](assets2/fig5_report.png)
 
4. Воспользовавшись опцией `-expand_buckets` получим развёрнутый список конечных точек  для тактовых сетей:

`report_clock_networks -endpoints_only -expand_buckets`

![alt_text](assets2/fig6_report.png)
 
5. Для того чтобы отсортировать конечные точки по типу `clock` и `nonclock` воспользуемся опцией `-suppress_endpoints` с ключом `clock` или `nonclock`. Сформируем отчет, в котором будут только таковые сети типа `nonclock`:

`report_clock_networks -endpoints_only -expand_buckets -suppress_endpoints clock`

![alt_text](assets2/fig7_report.png)
 
6. Для просмотра отчёта в графическом виде, воспользуемся опцией  `-name` :

`report_clock_networks –name Clocks_Network`
 
Этот отчёт также можно фильтровать, используя различные опции фильтрации, доступные в окне настроек:

![alt_text](assets2/fig8_report.png)
 
Также посмотрите:
- `create_clock`
- `get_clocks`
 
 
## Литература
   UG835 Vivado Design Suite Tcl Command Reference Guide
   UG906 Design Analysis and Closure Techniques

