// Food photos are from Wikimedia Commons under the licences below (CC BY-SA requires this credit).
// Shown on the public /credits page. Photos were cropped to 5:4 and re-encoded as WebP.
export interface PhotoCredit {
  key: string;
  dish: string;
  file: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    "key": "margherita-pizza",
    "dish": "Margherita Pizza",
    "file": "Margherita Originale.JPG",
    "author": "Mario56",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Margherita_Originale.JPG"
  },
  {
    "key": "farmhouse-pizza",
    "dish": "Farmhouse Veg Pizza",
    "file": "Supreme pizza.jpg",
    "author": "Scott Bauer",
    "license": "Public domain",
    "licenseUrl": "",
    "source": "https://commons.wikimedia.org/wiki/File:Supreme_pizza.jpg"
  },
  {
    "key": "paneer-tikka-pizza",
    "dish": "Paneer Tikka Pizza",
    "file": "Malai Paneer Pizza from India.jpg",
    "author": "Barthateslisa",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Malai_Paneer_Pizza_from_India.jpg"
  },
  {
    "key": "pepperoni-pizza",
    "dish": "Chicken Pepperoni Pizza",
    "file": "Fat Slice pepperoni pizza slice.JPG",
    "author": "BrokenSphere",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Fat_Slice_pepperoni_pizza_slice.JPG"
  },
  {
    "key": "bbq-chicken-pizza",
    "dish": "BBQ Chicken Pizza",
    "file": "Chicken Pizza made in Uganda.jpg",
    "author": "James Moore200",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Chicken_Pizza_made_in_Uganda.jpg"
  },
  {
    "key": "veg-burger",
    "dish": "Classic Veg Burger",
    "file": "Fancy Veggie Burger and Fries - Joe's Burger House 2024-07-07.jpg",
    "author": "Andy Li",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "source": "https://commons.wikimedia.org/wiki/File:Fancy_Veggie_Burger_and_Fries_-_Joe%27s_Burger_House_2024-07-07.jpg"
  },
  {
    "key": "paneer-burger",
    "dish": "Spicy Paneer Burger",
    "file": "Burger and fries on a wooden plate.jpg",
    "author": "Pattaya Patrol",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Burger_and_fries_on_a_wooden_plate.jpg"
  },
  {
    "key": "chicken-burger",
    "dish": "Crispy Chicken Burger",
    "file": "Fried chicken burger .jpg",
    "author": "Kurt Kaiser",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "source": "https://commons.wikimedia.org/wiki/File:Fried_chicken_burger_.jpg"
  },
  {
    "key": "cheese-burger",
    "dish": "Double Cheese Burger",
    "file": "Cheeseburger with onions at Hatfield Heath Festival 2017.jpg",
    "author": "Acabashi",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cheeseburger_with_onions_at_Hatfield_Heath_Festival_2017.jpg"
  },
  {
    "key": "french-fries",
    "dish": "French Fries",
    "file": "Hesburger French fries on a plate.jpg",
    "author": "JIP",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Hesburger_French_fries_on_a_plate.jpg"
  },
  {
    "key": "peri-peri-fries",
    "dish": "Peri Peri Fries",
    "file": "French Fries (8556689169).jpg",
    "author": "goanfishcurryrice3",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:French_Fries_(8556689169).jpg"
  },
  {
    "key": "garlic-bread",
    "dish": "Garlic Bread",
    "file": "Garlic Bread Mozzarella - Oregano Pizzeria 2025-05-17.jpg",
    "author": "Andy Li",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "source": "https://commons.wikimedia.org/wiki/File:Garlic_Bread_Mozzarella_-_Oregano_Pizzeria_2025-05-17.jpg"
  },
  {
    "key": "onion-rings",
    "dish": "Onion Rings",
    "file": "Onion rings served in Fort William.jpg",
    "author": "Grendelkhan",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Onion_rings_served_in_Fort_William.jpg"
  },
  {
    "key": "chicken-nuggets",
    "dish": "Chicken Nuggets (6 pcs)",
    "file": "Impossible chicken nuggets 2.jpg",
    "author": "Mx. Granger",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "source": "https://commons.wikimedia.org/wiki/File:Impossible_chicken_nuggets_2.jpg"
  },
  {
    "key": "chicken-wings",
    "dish": "Hot Chicken Wings (6 pcs)",
    "file": "Buffalo Burgers Buffalo Chicken Wings (36082467922).jpg",
    "author": "Willis Lam",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Buffalo_Burgers_Buffalo_Chicken_Wings_(36082467922).jpg"
  },
  {
    "key": "paneer-wrap",
    "dish": "Paneer Tikka Wrap",
    "file": "Smoked chicken and avocado wrap.jpg",
    "author": "Takeaway",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Smoked_chicken_and_avocado_wrap.jpg"
  },
  {
    "key": "chicken-shawarma",
    "dish": "Chicken Shawarma Wrap",
    "file": "Shawarma Sandwich.jpg",
    "author": "Siqbal at English Wikipedia",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Shawarma_Sandwich.jpg"
  },
  {
    "key": "grilled-cheese",
    "dish": "Grilled Cheese Sandwich",
    "file": "Grilled cheese sandwich with roasted tomato soup.jpg",
    "author": "jeffreyw",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Grilled_cheese_sandwich_with_roasted_tomato_soup.jpg"
  },
  {
    "key": "club-sandwich",
    "dish": "Chicken Club Sandwich",
    "file": "Club-sandwich.jpg",
    "author": "Memm",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Club-sandwich.jpg"
  },
  {
    "key": "cappuccino",
    "dish": "Cappuccino",
    "file": "Cappuccino and cookie.jpg",
    "author": "TricksterWildcat",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cappuccino_and_cookie.jpg"
  },
  {
    "key": "latte",
    "dish": "Caffè Latte",
    "file": "Caffe Latte cup.jpg",
    "author": "Maksym Kozlenko",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Caffe_Latte_cup.jpg"
  },
  {
    "key": "iced-latte",
    "dish": "Iced Latte",
    "file": "Iced Coffee in Glass - Sunshine Coffee - Laramie Cafe (53838344552).jpg",
    "author": "Tony Webster",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Iced_Coffee_in_Glass_-_Sunshine_Coffee_-_Laramie_Cafe_(53838344552).jpg"
  },
  {
    "key": "caramel-frappe",
    "dish": "Caramel Frappe",
    "file": "Chili-mango milkshake - Sparkys - Hatch New Mexico.jpg",
    "author": "Samat Jain from New York City, USA",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Chili-mango_milkshake_-_Sparkys_-_Hatch_New_Mexico.jpg"
  },
  {
    "key": "hot-chocolate",
    "dish": "Hot Chocolate",
    "file": "Hot cocoa in a mug with a hand sprinkling chili pepper flakes onto the whipped cream (15852162626).jpg",
    "author": "Personal Creations",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Hot_cocoa_in_a_mug_with_a_hand_sprinkling_chili_pepper_flakes_onto_the_whipped_cream_(15852162626).jpg"
  },
  {
    "key": "iced-tea",
    "dish": "Lemon Iced Tea",
    "file": "Ice Tea (2571858493).jpg",
    "author": "MzScarlett / A.K.A. Michelle from Missouri",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Ice_Tea_(2571858493).jpg"
  },
  {
    "key": "brownie",
    "dish": "Chocolate Brownie",
    "file": "Brownie IMG 001.jpg",
    "author": "Phadke09",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Brownie_IMG_001.jpg"
  },
  {
    "key": "lava-cake",
    "dish": "Choco Lava Cake",
    "file": "Vegan Flourless Swiss Chocolate Molten Lava Cake (4865230786).jpg",
    "author": "Vegan Feast Catering",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Vegan_Flourless_Swiss_Chocolate_Molten_Lava_Cake_(4865230786).jpg"
  },
  {
    "key": "cheesecake",
    "dish": "Blueberry Cheesecake",
    "file": "Cheesecake with blueberry topping.jpg",
    "author": "Chris Gladis",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cheesecake_with_blueberry_topping.jpg"
  },
  {
    "key": "donut",
    "dish": "Chocolate Donut",
    "file": "Glazed doughnut (1387272).jpg",
    "author": "Unknown authorUnknown author",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "source": "https://commons.wikimedia.org/wiki/File:Glazed_doughnut_(1387272).jpg"
  },
  {
    "key": "chocolate-milkshake",
    "dish": "Chocolate Milkshake",
    "file": "New chocolate milk.JPG",
    "author": "Sugar Bear",
    "license": "Public domain",
    "licenseUrl": "",
    "source": "https://commons.wikimedia.org/wiki/File:New_chocolate_milk.JPG"
  }
];
