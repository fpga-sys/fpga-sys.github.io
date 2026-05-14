---
title: Скрипт Net2axis
date: 2021-10-13
categories:
  - article
  - Simulation
  - Vivado
  - ethernet
---

> автор: 0xBADC0FFE

# Скрипт Net2axis

## Аннотация
При разработке устройств на FPGA часто возникает необходимость симуляции сетевого трафика. Избавиться от столь рутинной процедуры вам поможет скрипт [Net2axis](https://github.com/lucasbrasilino/net2axis).

![alt_text](2019-12-15-script-pcap2axis/fig1.jpg)


## Описание работы
Данный скрипт позволяет генерировать AXI-Stream пакеты из файлов *.pcap (packet capture). Файлы pcap можно получить захватив сетевой трафик например с помощью [Wireshark](https://www.wireshark.org/)/tcpdump либо воспользовавшись конструктором пакетов [PackEth](http://packeth.sourceforge.net/packeth/Home.html).
Для запуска Net2axis необходим Python 2.7.X и Scapy 2.X. Работа скрипта сводится к двум этапам:

1. Файл *.pcap при помощи net2axis.py конвертируется в *.dat;
2. Полученный файл подключается к AXI-Stream генератору net2axis_master.v. 

## Демонстрация работы

Чтобы продемонстрировать работу скрипта захватим несколько пакетов ping(протокол ICMP). Запускаем Wireshark и выбираем активный сетевой интерфейс в меню Capture ->  Options, затем жмем Start. 
Во время процедуры захвата пакетов я отправил несколько ping-запросов к моему роутеру, после чего остановил Wireshark выполнив команду Capture -> Stop.
Чтобы из всех захваченных пакетов отобразить только интересующие нас ICMP я задал фильтр следующего содержания:
```
icmp && ip.dst==192.168.0.1
```

![alt_text](2019-12-15-script-pcap2axis/fig2.png)

Экспортируем отфильтрованные пакеты в файл _ping.pcap_, для этого в меню **File** выбираем **Export Specified Packets**. 
 
Теперь можно запустить скрипт _Net2axis_. Сейчас в моем распоряжении ноутбук с Windows 10 и установка **scapy** предвещает танцы с бубном, поэтому я воспользовался эмулятором **Ubuntu 18.04** из Microsoft  Store. Сразу после установки эмулятора открываем проводник, переходим в директорию, в которую ранее сохранили файл ping.pcap и с зажатым shift вызываем контекстное меню.

![alt_text](2019-12-15-script-pcap2axis/fig3.png)

В появившемся окне терминала, выполняем серию команд для установки scapy:
```shell
sudo apt-get update
sudo apt-get install python-scapy
```

Клонируем репозиторий Net2axis:
```shell
git clone https://github.com/lucasbrasilino/net2axis
```

Конвертируем ping.pcap в ping.dat:

```shell
mv ping.pcap ./net2axis/tool
cd ./net2axis/tool
python net2axis.py -w 64 -i 100 -d 100 ping.pcap
```

Рассмотрим параметры скрипта:

- `-w` ширина axi-stream;
- `-i` задержка в тактах с момента снятия сигнала сброса до передачи первого пакета;
- `-d` задержка в тактах между последующими пакетами;

В директории `/tool` появился файл _ping.dat_, который можно использовать при симуляции. Обзорный тестбенч находится в директории _sim_, сам генератор пакетов расположен в директории _hdl_. После запуска симуляции я получил такую временную диаграмму:

## Расширяем функционал
Пока писал этот текст возникла идея реализовать скрипт с обратным функционалом(axi-stream -> *.pcap). Первым делом добавим в симуляцию блок, который будет сохранять каждый принятый пакет в виде новой hex-строки. У меня получился такой код:

```verilog
    integer fdesc, i;
       
    initial begin
        forever begin
            fdesc = $fopen("outp.txt","a");
            while(!(M_AXIS_TREADY && M_AXIS_TVALID && M_AXIS_TLAST)) begin
                @(posedge ACLK) begin
                    if (M_AXIS_TREADY && M_AXIS_TVALID) begin
                        for (i = 0; i < 8; i=i+1) begin
                            if (M_AXIS_TKEEP[i]) $fwrite(fdesc,"%h", M_AXIS_TDATA[i*8+:8]);
                        end
                        if (M_AXIS_TREADY && M_AXIS_TVALID && M_AXIS_TLAST) begin
                            $fwrite(fdesc,"\n");
                            $fclose(fdesc);
                        end
                    end
                end
            end
            wait(!(M_AXIS_TREADY && M_AXIS_TVALID && M_AXIS_TLAST));
        end
    end
```

Теперь дело за малым - реализовать python-скрипт, который будет конвертировать полученный текстовый файл в формат *.pcap:

```python
from scapy.all import *
 
text_dump = open('outp.txt', 'r')
 
for i in text_dump:
    hex_str = i.split('\r\n')[0]
    current_packet = Ether(hex_bytes(hex_str))
    wrpcap('outp.pcap', current_packet, append=True)
```

Сохраняем скрипт в файл axis2net.py, размещаем его в одной директории с файлом outp.txt и запускаем командой:
```shell
python axis2net.py
```

После запуска должен появиться файл outp.pcap, который отлично открывается при помощи Wireshark. Я использовал всё ту же scapy, на удивление эта библиотека оказалась простой и функциональной. На хабре есть хорошая статья про данную библиотеку - рекомендую ознакомиться.
На этой ноте завершаю свой обзор, благодарю за внимание! 

P.S. Хочу обратиться к сообществу FPGA-Systems. На просторах сети много достойных проектов, о которых знают не все. Если вы нашли что-то полезное - напишите небольшой обзор, думаю многие будут благодарны.


<div id="telegram-comments"></div>

<script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-discussion="fpgasystems_events/3791"
        data-comments-limit="20">
</script>