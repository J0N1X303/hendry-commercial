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

# Hendry Commercial approved concept 1 mark
# Main green folded ribbon
d.polygon([(70,115),(100,79),(132,64),(123,93),(117,100),(112,111),(109,126),(112,140),(120,151),(133,158),(147,161),(159,161),(176,117),(166,122),(154,127),(145,130),(142,128),(140,123),(143,116),(157,93)],fill=ACCENT)
# Dark inner turn and green return create the implied C
d.ellipse((108,113,151,157),fill=(9,42,27))
d.polygon([(141,122),(149,128),(161,130),(176,117),(170,135),(160,145),(150,147),(142,143),(138,136)],fill=(22,115,71))
# White forward blade
d.polygon([(148,161),(169,100),(203,82),(187,145),(177,153)],fill=TEXT)
# Divider and stacked wordmark
d.line((224,65,224,154),fill=(83,102,90),width=1)
d.text((246,77),"HENDRY",font=font(22,True),fill=TEXT)
d.text((246,105),"COMMERCIAL",font=font(14),fill=(229,233,230))

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
