---
title: Инструкция по настройке ARM Arch Linux RootFS
type: article
date: 2025-05-05
author: lazba
tags:
  - article
  - linux
---

> автор: [t.me/lazba](https://t.me/lazba)

# Инструкция по настройке ARM Arch Linux RootFS


__Содержание:__

- [Prepare](#prepare)
- [Qemu](#qemu)
- [Setup](#setup)
- [Shrink](#shrink)


## Prepare

Скачать последнюю сборку Archlinux

```sh
curl -LO http://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz
curl -LO http://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz.md5
md5sum -c ArchLinuxARM-aarch64-latest.tar.gz.md5
```

Создать файл-основу на 10 ГБ для образа

```sh
dd if=/dev/zero of=arch-rootfs.img bs=1M count=10240
mkfs.ext4 arch-rootfs.img
```

Примонтировать файл и распаковать в него базовую систему:

```sh
sudo mkdir -p /mnt/archlinux
sudo losetup --find --show arch-rootfs.img
sudo mount /dev/loop0 /mnt/archlinux
sudo bsdtar -xpf ArchLinuxARM-aarch64-latest.tar.gz -C /mnt/archlinux
```

Для дальнейшей работы нужны 
- Statically-linked QEMU User space emulator for AArch64 + binfmt_misc configurations.
    - В ArchLinux host можно установить qemu-user-static qemu-user-static-binfmt. 
- [arch-install-scripts](https://github.com/archlinux/arch-install-scripts), а именно arch-chroot.
    -  Скачать, вызвать `make install`


chroot в новую систему

```sh
sudo arch-chroot /mnt/archlinux /bin/bash
```

Проверим

```sh
# uname -m
aarch64
```

Initialize the pacman keyring:

```sh
pacman-key --init
pacman-key --populate archlinuxarm
```

Удалим предустановленное ядро и обновим все пакеты, а также установим часть необходимых (можно установить те пакеты что есть на https://archlinuxarm.org/). `base-devel` и `go` нужны чтобы позднее установить yay AUR helper. 

```sh
pacman -Rnd linux-aarch64
pacman -Syyuu git base-devel i2c-tools iputils go python python-setuptools python-wheel python-numpy sudo linux-headers
```

Зададим пароль пользователя

```sh
passwd alarm
```

Закрываем образ

```sh
sudo umount /mnt/archlinux
sudo losetup -d /dev/loop0
```

## QEMU

Далее можно настроить оставшиеся пакеты через AUR с помощью полноценной qemu симуляции. 

Можно пропустить этот этап, и установить AUR пакеты уже на самом устройстве.

Для запуска системы через QEMU-эмулятор потребуются соответствующие U-Boot, kernel, dtb


./kernel-qemu/build_kernel.sh

```sh
#!/bin/bash

KERNEL_REPO=/tools/linux-xlnx
COMPILER_NAME_PREFIX=aarch64-linux-gnu-
CPU_CORES=$(($(nproc) - 1))
# Ensure CORES is at least 1
if [ "$CPU_CORES" -lt 1 ]; then
    CPU_CORES=1
fi

make -C $KERNEL_REPO O=$PWD ARCH=arm64 CROSS_COMPILE=$COMPILER_NAME_PREFIX qemu_arm64_defconfig
make -C $KERNEL_REPO O=$PWD ARCH=arm64 CROSS_COMPILE=$COMPILER_NAME_PREFIX nconfig
make -C $KERNEL_REPO -j"$CPU_CORES" O=$PWD ARCH=arm64 CROSS_COMPILE=$COMPILER_NAME_PREFIX

PROJECT_FOLDER=$(dirname $0)
cp -rf $PROJECT_FOLDER/arch/arm64/boot/Image $PROJECT_FOLDER/../Image
```

./uboot-qemu/build-uboot.sh

```sh
#!/bin/bash
UBOOT_REPO=/tools/u-boot-xlnx/
COMPILER_NAME_PREFIX=aarch64-linux-gnu-
CPU_CORES=$(($(nproc) - 1))
# Ensure CORES is at least 1
if [ "$CPU_CORES" -lt 1 ]; then
    CPU_CORES=1
fi

make -C $UBOOT_REPO O=$PWD CROSS_COMPILE=$COMPILER_NAME_PREFIX qemu_arm64_defconfig  
make -C $UBOOT_REPO O=$PWD CROSS_COMPILE=$COMPILER_NAME_PREFIX -j"$CPU_CORES"  

PROJECT_FOLDER=$(dirname $0)
cp -rf $PROJECT_FOLDER/u-boot.bin $PROJECT_FOLDER/../u-boot.bin
```

генерировать dtb:

```sh
qemu-system-aarch64 -machine virt -machine dumpdtb=qemu.dtb
```

qemu-system-aarch64.sh
```sh
qemu-system-aarch64 \
    -M virt \
    -cpu cortex-a53 \
    -smp 4 \
    -m 4G \
    -nographic \
    -bios ./u-boot.bin \
    -kernel ./Image \
    -drive if=none,file=./arch-rootfs.img,format=raw,id=hd0 \
    -append "root=/dev/vda rw console=ttyAMA0 earlycon earlyprintk debug" \
    -device virtio-blk-device,drive=hd0 \
    -netdev user,id=net0,hostfwd=tcp::2222-:22 \
    -device virtio-net-device,netdev=net0 \
    -d guest_errors,unimp,cpu_reset \
    -D qemu.log
```
## Setup

Настроим пользователя alarm и установим оставшиеся пакеты. От root user:

```sh
usermod -aG wheel alarm
visudo
```

ищем строку `# %wheel ALL=(ALL:ALL) NOPASSWD: ALL` и раскомментируем её убирая символ `#`. Сохраняем командой `:wq`


Переходим в пользователя:

```sh
cd /home/alarm
su alarm
```

Устанавливаем yay AUR helper

```sh
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
```

Устанавливаем необходимые приложения

```sh
yay -S --noconfirm can-utils python-spidev python-smbus2 python-cantools
```

## Shrink

Уменьшим размер .img файла, чтобы ускорить его загрузку на sd карту


```sh
# Attach the image to a loop device
LOOP_DEV=$(sudo losetup --find --show arch-rootfs.img)
# Check the filesystem for consistency
sudo e2fsck -f ${LOOP_DEV}
# Determine the minimum size (in blocks)
sudo resize2fs -P ${LOOP_DEV}
```

The output will give you something like:

```
Estimated minimum size of the filesystem: 123456 blocks
```

_Note_: Each block is usually 4096 bytes. Convert the block count to MB if needed.


Сначала уменьшим файловую систему на образе, затем обрежем (trunc) сам файл.

```sh
sudo resize2fs ${LOOP_DEV} 5G
sudo losetup -d ${LOOP_DEV}
truncate -s 5G arch-rootfs.img
```

Проверим, сколько осталось места

```sh
LOOP_DEV=$(sudo losetup --find --show arch-rootfs.img)
sudo mount ${LOOP_DEV} /mnt/archlinux
df -h /mnt/archlinux
```

output is:

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/loop0      4.9G  3.4G  1.3G  74% /mnt/archlinux
```

Закроем файл

```sh
sudo umount /mnt/archlinux
sudo losetup -d ${LOOP_DEV}
```



<div id="telegram-comments"></div>
<script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-discussion="fpgasystems_events/3255"
        data-comments-limit="20">
</script>