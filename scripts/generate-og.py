from PIL import Image, ImageDraw, ImageFont

W,H=1200,630
BG=(8,17,12)
ACCENT=(99,217,149)
TEXT=(243,244,239)
MUTED=(184,196,188)
img=Image.new("RGB",(W,H),BG)
d=ImageDraw.Draw(img)

# understated green depth
for x,y,r,c in [
    (-120,-120,480,(18,55,31)),
    (1110,120,430,(12,45,26)),
]:
    d.ellipse((x-r,y-r,x+r,y+r),fill=c)

# geometric brand lines
d.arc((825,-120,1375,430),280,95,fill=ACCENT,width=3)
for i in range(5):
    y=465+i*28
    d.line((790,y,1240,y-130),fill=(39,112,67),width=2)

def font(size,bold=False):
    path="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path,size)

# HC mark
d.rounded_rectangle((70,62,124,116),radius=11,fill=(13,23,16),outline=(62,92,72),width=1)
d.rectangle((97,62,124,116),fill=ACCENT)
d.text((78,77),"H",font=font(18,True),fill=TEXT)
d.text((103,77),"C",font=font(18,True),fill=(6,18,11))
d.text((145,75),"HENDRY COMMERCIAL",font=font(19,True),fill=TEXT)

# right-hand operating words
for i,t in enumerate(["QUESTION","SIMPLIFY","BUILD","GROW"]):
    d.text((1010,76+i*29),t,font=font(14),fill=(154,174,161))

# core message
d.text((70,205),"Jonathan Hendry",font=font(70,True),fill=TEXT)
d.text((72,300),"Commercial Leader · Builder",font=font(31,True),fill=ACCENT)
d.text((72,382),"BUY  ·  SELL  ·  BUILD",font=font(25),fill=(215,223,217))
d.rectangle((72,503,136,506),fill=ACCENT)
d.text((72,526),"hendrycommercial.co.uk",font=font(21),fill=MUTED)

img.save("social-preview.png",optimize=True)
