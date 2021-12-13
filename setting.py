import pygame
class settings():
    def __init__(self):
        self.width=1200
        self.high=800
        self.color=(230,230,230)
        self.speed=1
        #bullet
        self.bullet_speed=2
        self.bullet_width=1
        self.bullet_hight=3
        self.bullet_img=pygame.image.load('photos/DaiXie.bmp')