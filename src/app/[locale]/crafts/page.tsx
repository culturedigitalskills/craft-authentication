import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Container } from '@/components/layout/Container';
import { CardTitle, CardContent, CardDescription, CardHeader, Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/dist/client/link';
import Image from 'next/image';
import { Calendar, User } from 'lucide-react';
import { formatDateTime } from '@/components/formatDateTime';


// export default async function CraftsPage() {
    // const session = await auth()        

    // if (!session) {
    //     redirect('/login')
    // }
    // return <CraftsPageContent session={session} />;

// }
// function CraftsPageContent({session}: {session: any}) {
export default function CraftsPage() {

    const t = useTranslations();
    let crafts = [
  {
    "id": 1,
    "title": "Macramé Wall Hanging",
    "description": "A decorative textile art created by knotting rope or cord into intricate patterns. Using basic knots like the square knot and half hitch, you can craft stunning boho-style wall pieces that add texture and warmth to any room.",
    "owner": "Sophie Hartwell",
    "email": "sophie.hartwell@crafthaus.io",
    "createdAt": "2025-03-12T08:24:11Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/7/70/Textile_piece%2C_macram%C3%A9_%28AM_16090-2%29.jpg"
  },
  {
    "id": 2,
    "title": "Hand-Thrown Pottery",
    "description": "The ancient craft of shaping clay vessels on a spinning wheel. From bowls to vases, hand-thrown pottery combines rhythmic technique with creative instinct, resulting in uniquely imperfect pieces that carry the maker's touch in every curve.",
    "owner": "Marcus Delgado",
    "email": "m.delgado@clayworks.co",
    "createdAt": "2025-04-07T14:03:55Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Pottenbakkersschijf.JPG"
  },
  {
    "id": 3,
    "title": "Linocut Printmaking",
    "description": "A relief printing technique where designs are carved into a linoleum block, inked, and pressed onto paper or fabric. The bold, graphic quality of linocut prints makes it perfect for posters, greeting cards, and repeating textile patterns.",
    "owner": "Yuki Tanaka",
    "email": "yuki.tanaka@pressandink.studio",
    "createdAt": "2025-05-19T11:47:30Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/1/12/Printing_Using_a_Linocut_Design.jpg"
  },
  {
    "id": 4,
    "title": "Soy Candle Making",
    "description": "The craft of pouring scented soy wax into moulds or vessels with embedded wicks. By blending essential oils and botanicals, makers create bespoke candles with unique aromas and burn times far cleaner than traditional paraffin alternatives.",
    "owner": "Clara Osei",
    "email": "clara.osei@wickandwax.com",
    "createdAt": "2025-06-02T09:15:00Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/b/be/Soy_tealight_candles.jpg"
  },
  {
    "id": 5,
    "title": "Bookbinding",
    "description": "The art of assembling handmade books by folding, sewing, and gluing paper signatures into custom covers. From Coptic stitch journals to leather-bound notebooks, bookbinding produces heirloom-quality objects built to last generations.",
    "owner": "Finn Calloway",
    "email": "finn@spineandstitch.net",
    "createdAt": "2025-07-28T16:52:43Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Bookbinding_tie_thread_1.jpg"
  },
  {
    "id": 6,
    "title": "Indigo Dyeing",
    "description": "An ancient resist-dyeing technique using natural indigo pigment to produce striking blue patterns on fabric. Methods like shibori involve folding, twisting, or binding cloth before immersion, yielding one-of-a-kind wearable pieces.",
    "owner": "Amara Diallo",
    "email": "amara.diallo@indigostudio.co",
    "createdAt": "2025-08-14T07:38:22Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/0/0c/GutierrezWorkshopTeotitlan073.jpg"
  },
  {
    "id": 7,
    "title": "Stained Glass",
    "description": "The craft of cutting and joining coloured glass pieces with lead came or copper foil to form luminous panels. When light passes through the finished work, the colours shift and glow, transforming any window or frame into living art.",
    "owner": "Petra Novák",
    "email": "petra.novak@lumenglass.eu",
    "createdAt": "2025-09-03T13:21:09Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/c/c8/Leonard_French_La_Trobe_03-2_cropped.jpg"
  },
  {
    "id": 8,
    "title": "Leather Tooling",
    "description": "A craft of stamping and carving decorative patterns into vegetable-tanned leather using specialised tools. The dampened surface accepts deep impressions that dry permanently, making it ideal for belts, wallets, and journal covers.",
    "owner": "Rodrigo Alves",
    "email": "r.alves@hidecraft.io",
    "createdAt": "2025-10-17T10:05:37Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/6/6c/For%C3%B2.JPG"
  },
  {
    "id": 9,
    "title": "Wet Felting",
    "description": "A textile craft that bonds raw wool fibres together using hot water, soap, and agitation to create a dense, seamless fabric. Sculptural forms, bowls, and wall art can all be shaped during the felting process before the material sets.",
    "owner": "Ingrid Sørensen",
    "email": "ingrid.sorensen@woolform.dk",
    "createdAt": "2025-11-25T18:44:50Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/5/5b/An_assortment_of_fiber_arts_created_by_one_teenage_artist_%2881c7f627-155d-451f-677b-05a5b8ebb4ff%29.JPG"
  },
  {
    "id": 10,
    "title": "Resin Casting",
    "description": "The process of pouring pigmented or clear epoxy resin into moulds to encapsulate botanicals, pigments, or objects. Once cured, the result is a glass-like solid that can be shaped into jewellery, coasters, or sculptural decorative pieces.",
    "owner": "Theo Abara",
    "email": "theo@resinrift.studio",
    "createdAt": "2025-12-31T23:59:01Z",
    "image": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Resin_crafts.jpg"
  }
];

    return (
        <Container>
        {/* <div className="px-4 py-16">
             */}
             <div className="mx-auto mb-12 max-w-3xl text-center">
                <h1 className="mb-8 text-4xl font-bold">{t('crafts.welcomeTitle')} </h1>
                <p className="text-lg text-muted-foreground">
                   {t('crafts.description')}
                </p>

            </div>
            {/* </div>
        </div> */}
        {/* Crafts Grid */}
       
        {crafts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {crafts.map((craft) => {
            // const owner = typeof craft.owner === 'object' ? craft.owner : null;
            // const image = typeof craft.image === 'object' ? craft.image : null;
            const imageUrl = craft.image;
            // const ownerId = typeof craft.owner === 'object' ? craft.owner.id : craft.owner;
            const craftUrl = `crafts/${craft.id}`;

            return (
                <Card key={craft.id} className="group transition-shadow duration-200 hover:shadow-lg">
                <Link href={craftUrl} className="block">
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={craft.title}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <p className="text-muted-foreground">{t('crafts.explore.noImageAvailable')}</p>
                      </div>
                    )}
                    {/* <div className="absolute right-2 top-2">
                      <Badge variant="outline" className="bg-white/90 text-xs">
                        Public
                      </Badge>
                    </div> */}                    
                    </div>

                    {/* Content */}
                    <CardHeader className="pb-2 bg-muted">
                    <CardTitle className="line-clamp-1 transition-colors group-hover:text-primary">
                        {craft.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{craft.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 bg-muted">
                    <div className="space-y-2">
                    {/* Creator information */}                        
                    {craft.owner && (
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('crafts.explore.by')}</span>
                          <span className="font-medium">{craft.email}</span>
                        </div>
                      )}
                    {/* Created date */}
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateTime(craft.createdAt)}</span>
                      </div>                           
                    </div>
                    </CardContent>
                </Link>    
                </Card>
            );
            })}
        </div>
        ) : (
        <p className="text-center text-muted-foreground">No crafts found.</p>
        
        )}
    
        </Container>
    )

}
