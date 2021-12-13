import pygame

class teacher_chen():
    def __init__(self,screen):
        self.screen=screen
        self.image=pygame.image.load('photos/chenping.bmp')
        self.screen_rect=screen.get_rect()
        self.moving="pause"
        self.rect=[self.screen_rect.centerx,self.screen_rect.centery]
    def update_place(self,speed):
        if self.moving=='right':
            self.rect[0]+=speed
        if self.moving=='left':
            self.rect[0]-=speed
        if self.moving=='up':
            self.rect[1]-=speed
        if self.moving=='down':
            self.rect[1]+=speed
    def blit(self):
        self.screen.blit(self.image,self.rect)