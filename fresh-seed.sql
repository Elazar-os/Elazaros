-- ============================================================
-- KING OF DELANCEY — COMPLETE MENU DATA UPDATE
-- Run this directly in your Replit database console
-- or via: node -e "require('./run-seed.js')"
-- ============================================================

-- STARTERS
UPDATE menu_items SET description = 'All beef hot dog', price = '6.95' WHERE name = 'Hot Dog Classic';
UPDATE menu_items SET description = 'Extra long all beef hot dog', price = '12.95' WHERE name = 'Foot Long Hot Dog';
UPDATE menu_items SET description = 'Hot dog topped with chili', price = '14.95' WHERE name = 'Chili Dog';
UPDATE menu_items SET description = 'Hearty beef chili', price = '10.95' WHERE name = 'Bowl of Chili';
UPDATE menu_items SET description = 'Crispy egg roll with pastrami filling', price = '8.95' WHERE name = 'Pastrami Egg Roll';
UPDATE menu_items SET description = 'Crispy egg roll with pulled beef', price = '8.95' WHERE name = 'Pulled Beef Egg Roll';
UPDATE menu_items SET description = 'Breaded & fried onion, served w/ dijon mustard', price = '14.95' WHERE name = 'Blooming Onion';
UPDATE menu_items SET description = 'Assorted peppers and squash', price = '11.95' WHERE name = 'Grilled Vegetables';
UPDATE menu_items SET description = 'Classic or Chipotle', price = '13.95' WHERE name = 'Poppers';
UPDATE menu_items SET description = 'Corn flake breaded chicken fingers', price = '15.95' WHERE name = 'Corn Flake Chicken Fingers';
UPDATE menu_items SET description = 'Pretzel breaded chicken fingers', price = '15.95' WHERE name = 'Pretzel Chicken Fingers';
UPDATE menu_items SET description = '8pc / 16pc', price = '12.95' WHERE name = 'Chicken Nuggets';
UPDATE menu_items SET description = NULL, price = '14.95' WHERE name = 'Grilled Chicken Wings';
UPDATE menu_items SET description = '12pc / 24pc', price = '16.95' WHERE name = 'Buffalo Wings';
UPDATE menu_items SET description = 'Fire Poppers, Buffalo Wings & a Flower Onion', price = '31.95' WHERE name = 'Mix & Match Platter';
UPDATE menu_items SET description = 'Fries topped with chili, chopped onion, jalapenos, chopped tomato & garlic aioli', price = '19.95' WHERE name = 'Loaded Chili Fries';
UPDATE menu_items SET description = 'Fries topped with pulled beef, chopped onion, jalapenos, chopped tomato & garlic aioli', price = '21.95' WHERE name = 'Loaded Beef Fries';
UPDATE menu_items SET description = 'Chicken poppers topped with chili, chopped onion, jalapenos, chopped tomato & garlic aioli', price = '29.95' WHERE name = 'Loaded Chili Poppers';
UPDATE menu_items SET description = 'Chicken poppers topped with pulled beef, chopped onion, chopped tomato, jalapenos & garlic aioli', price = '29.95' WHERE name = 'Loaded Beef Poppers';
UPDATE menu_items SET description = NULL, price = '19.95' WHERE name = 'Cauliflower Poppers';
UPDATE menu_items SET description = 'Gnocchi topped with pulled beef, chopped onion, jalapenos, chopped tomatoes and garlic aioli', price = '28.95' WHERE name = 'Pulled Beef Gnocchi';
UPDATE menu_items SET description = NULL, price = '19.95' WHERE name = 'Sesame Chicken w/ Rice';

-- SOUPS
UPDATE menu_items SET description = 'Classic chicken noodle soup', price = '9.95' WHERE name = 'Chicken Noodle';
UPDATE menu_items SET description = 'Hearty mushroom barley soup', price = '9.95' WHERE name = 'Mushroom Barley';
UPDATE menu_items SET description = 'Fresh vegetable soup', price = '9.95' WHERE name = 'Vegetable';
UPDATE menu_items SET description = 'Classic split pea soup', price = '9.95' WHERE name = 'Split Pea';
UPDATE menu_items SET description = 'Homemade matzah ball soup', price = '9.95' WHERE name = 'Chicken Matzah Ball';
UPDATE menu_items SET description = 'Fresh broccoli cauliflower soup', price = '9.95' WHERE name = 'Broccoli Cauliflower';
UPDATE menu_items SET description = 'Fresh zucchini soup', price = '9.95' WHERE name = 'Zucchini';

-- SALADS
UPDATE menu_items SET description = 'Lettuce, grape tomatoes, red onion & croutons', price = '14.95' WHERE name = 'Caesar Salad';
UPDATE menu_items SET description = 'Lettuce, grape tomatoes, cucumbers, tri colored peppers, red cabbage & carrot', price = '22.95' WHERE name = 'Grilled Chicken Salad';
UPDATE menu_items SET description = 'Base of romaine lettuce, choose 4 toppings, choose dressings', price = '15.95' WHERE name = 'Build Your Salad';

-- BURGERS
UPDATE menu_items SET description = '4oz homemade beef patty', price = '15.95' WHERE name = 'Burger';
UPDATE menu_items SET description = '2 x 4oz burgers & choice of french fries or baked potato', price = '21.95' WHERE name = 'Double Beef Burger';
UPDATE menu_items SET description = 'Oversized burger & choice of french fries or baked potato', price = '23.95' WHERE name = 'Delancey Burger';
UPDATE menu_items SET description = 'Oversized burger topped w/ chili & choice of french fries or baked potato', price = '27.95' WHERE name = 'Chili Burger';
UPDATE menu_items SET description = 'Oversized burger topped w/ pulled brisket & choice of french fries or baked potato', price = '29.95' WHERE name = 'Kansas City Burger';
UPDATE menu_items SET description = 'Oversized burger topped with grilled pastrami & choice of french fries or baked potato', price = '29.95' WHERE name = 'Pastrami Burger';
UPDATE menu_items SET description = 'Oversized burger topped w/ portobello mushroom & choice of french fries or baked potato', price = '28.95' WHERE name = 'Portobello Mushroom Burger';
UPDATE menu_items SET description = 'Oversized burger topped w/ pastrami & chili & choice of french fries or baked potato', price = '31.95' WHERE name = 'All In Burger';

-- WRAPS
UPDATE menu_items SET description = 'Chicken cutlet, lettuce, tomato, onion, house dressing', price = '22.95' WHERE name = 'Classic Grilled Chicken Wrap';
UPDATE menu_items SET description = 'Pretzel chicken, lettuce, tomato, onion', price = '21.95' WHERE name = 'Pretzel Chicken Wrap';
UPDATE menu_items SET description = 'Lettuce, tomato, fried onion, house dressing', price = '21.95' WHERE name = 'Schnitzel Wrap';
UPDATE menu_items SET description = 'Pargiot, lettuce, tomato, red onion, house dressing', price = '24.95' WHERE name = 'Baby Chicken Wrap';
UPDATE menu_items SET description = 'Corn flake chicken, lettuce, tomato, onion', price = '21.95' WHERE name = 'Cornflake Chicken Wrap';
UPDATE menu_items SET description = 'Lettuce, tomato, fried onion', price = '27.95' WHERE name = 'Steak Wrap';
UPDATE menu_items SET description = 'Lettuce, tomato, fried onion', price = '24.95' WHERE name = 'Pastrami Schnitzel Wrap';
UPDATE menu_items SET description = 'Grilled chicken breast with avocado, lettuce, tomato & red onion', price = '24.95' WHERE name = 'Avocado Chicken Wrap';
UPDATE menu_items SET description = 'Classic turkey with avocado, lettuce, tomato & red onion', price = '24.95' WHERE name = 'Avocado Turkey Wrap';
UPDATE menu_items SET description = 'Hot sauce, lettuce, tomato, fried onion', price = '21.95' WHERE name = 'Hot N Spicy Schnitzel Wrap';
UPDATE menu_items SET description = 'Lettuce, tomato, onion, pickles, and a side of french fries', price = '23.95' WHERE name = 'Burger Wrap';
UPDATE menu_items SET description = 'Lettuce, tomato, red onion. Options: Pastrami, Corned Beef, Turkey Breast, Smoked Turkey Breast', price = '22.95' WHERE name = 'Deli Wrap';
UPDATE menu_items SET description = NULL, price = '16.95' WHERE name = 'Grilled Vegetable Wrap';

-- SANDWICHES
UPDATE menu_items SET description = 'Grilled chicken, lettuce, tomato, pickles', price = '22.95' WHERE name = 'Grilled Chicken Sandwich';
UPDATE menu_items SET description = 'Lettuce, tomato, pickles', price = '21.95' WHERE name = 'Schnitzel Sandwich';
UPDATE menu_items SET description = 'Lettuce, tomato, pickles', price = '24.95' WHERE name = 'Baby Chicken Sandwich';
UPDATE menu_items SET description = 'Cornflake chicken, lettuce, tomato, pickles', price = '21.95' WHERE name = 'Cornflake Chicken Sandwich';
UPDATE menu_items SET description = 'Pretzel chicken, lettuce, tomato, pickles', price = '21.95' WHERE name = 'Pretzel Chicken Sandwich';
UPDATE menu_items SET description = 'Thin-sliced rib eye topped with grilled onions & bbq sauce', price = '27.95' WHERE name = 'Sliced Steak Sandwich';
UPDATE menu_items SET description = 'Skirt steak topped with grilled onions and homemade sino sauce', price = '35.95' WHERE name = 'Sino Steak Sandwich';
UPDATE menu_items SET description = 'Thinly sliced rib eye sauteed peppers and onions', price = '26.95' WHERE name = 'Harrys Philly Steak Sandwich';
UPDATE menu_items SET description = 'Served w/ cole slaw and a sour pickle. Options: Pastrami, Corned Beef, Turkey Breast, Smoked Turkey Breast', price = '22.95' WHERE name = 'Deli Sandwich';
UPDATE menu_items SET description = 'Breaded chicken cutlet topped with grilled pastrami', price = '24.95' WHERE name = 'Pastrami Schnitzel';
UPDATE menu_items SET description = 'Foot long schnitzel sandwich w/ lettuce, tomato, pickles & two sauces', price = '22.95' WHERE name = 'Bochur Sandwich';
UPDATE menu_items SET description = 'Foot long cornflake chicken sandwich w/ pastrami, lettuce, tomato, pickles, fried onions & two sauces', price = '24.95' WHERE name = 'New Bochur Sandwich';
UPDATE menu_items SET description = 'Sliced steak, lettuce, israeli salad, hummus, tehina, fried onion', price = '31.95' WHERE name = 'Steak Lafa';
UPDATE menu_items SET description = 'Grilled chicken, lettuce, israeli salad, hummus, tehina, fried onion', price = '26.95' WHERE name = 'Chicken Lafa';
UPDATE menu_items SET description = 'Pargiot, lettuce, Israeli salad, hummus, tehina, fried onion', price = '24.95' WHERE name = 'Baby Chicken Pita';
UPDATE menu_items SET description = 'Pulled brisket on brioche or baguette, served w/ ff or baked potato', price = '26.95' WHERE name = 'Pulled Brisket';

-- PLATTERS
UPDATE menu_items SET description = NULL, price = '29.95' WHERE name = 'Baby Chicken Pargiot';
UPDATE menu_items SET description = NULL, price = '27.95' WHERE name = 'Grilled Chicken Breast Cutlet';
UPDATE menu_items SET description = NULL, price = '26.95' WHERE name = 'Fried Chicken Cutlet';
UPDATE menu_items SET description = NULL, price = '46.95' WHERE name = 'Skirt Steak';
UPDATE menu_items SET description = NULL, price = '46.95' WHERE name = 'Rib Steak';

-- SHAWARMA
UPDATE menu_items SET description = NULL, price = '22.95' WHERE name = 'Shawarma Pita';
UPDATE menu_items SET description = NULL, price = '25.95' WHERE name = 'Shawarma Laffa';
UPDATE menu_items SET description = 'Choose two sides: French fries, spicy fries, baked potato, rice, coleslaw & Israeli salad', price = '29.95' WHERE name = 'Shawarma Platter w/ Pita';

-- FRIED CHICKEN
UPDATE menu_items SET description = '2 pcs + can of soda', price = '17.95' WHERE name = 'Snack Box';
UPDATE menu_items SET description = '3 pcs + can of soda', price = '24.95' WHERE name = 'Dinner Box';
UPDATE menu_items SET description = '5 pcs + 2 cans of soda', price = '32.95' WHERE name = 'Jumbo Box';

-- ON THE SIDE
UPDATE menu_items SET description = NULL, price = '6.95' WHERE name = 'Baked Potato';
UPDATE menu_items SET description = NULL, price = '6.95' WHERE name = 'White Rice';
UPDATE menu_items SET description = NULL, price = '3.95' WHERE name = 'Side of Cole Slaw';
UPDATE menu_items SET description = 'Small / Large', price = '7.95' WHERE name = 'French Fries';
UPDATE menu_items SET description = NULL, price = '10.95' WHERE name = 'Onion Rings';
UPDATE menu_items SET description = NULL, price = '8.95' WHERE name = 'Mashed Potatoes';
UPDATE menu_items SET description = NULL, price = '9.95' WHERE name = 'Mixed Green Salad';
UPDATE menu_items SET description = 'Served on Thursdays only', price = '9.95' WHERE name = 'Chulent';
UPDATE menu_items SET description = NULL, price = '9.95' WHERE name = 'Sweet Potato Chips';
UPDATE menu_items SET description = NULL, price = '3.95' WHERE name = 'Israeli Salad';
UPDATE menu_items SET description = NULL, price = '10.95' WHERE name = 'Steamed Vegetable Medley';

-- SPECIALS & KIDS
UPDATE menu_items SET description = 'Kids hot dog', price = '12.95' WHERE name = 'Hot Dog';
UPDATE menu_items SET description = NULL, price = '15.95' WHERE name = 'Corn Flake or Pretzel Chicken Fingers';
UPDATE menu_items SET description = 'Schnitzel on bun with lettuce, tomato, pickle', price = '15.95' WHERE name = 'Juniors Special';
UPDATE menu_items SET description = NULL, price = '15.95' WHERE name = '2 Hot Dogs';
UPDATE menu_items SET description = NULL, price = '21.95' WHERE name = '1 Hot Dog 1 Burger';
UPDATE menu_items SET description = 'Kids portion', price = '15.95' WHERE name = '6pc Chicken Nuggets';
UPDATE menu_items SET description = 'Kids burger', price = '16.95' WHERE name = '4oz Burger';
UPDATE menu_items SET description = NULL, price = '14.95' WHERE name = '6pc Buffalo Wings';

-- DRINKS
UPDATE menu_items SET description = NULL, price = '2.25' WHERE name = 'Bottled Water';
UPDATE menu_items SET description = NULL, price = '3.25' WHERE name = 'Fountain Soda';
UPDATE menu_items SET description = NULL, price = '3.25' WHERE name = 'Assorted Soda Can';
UPDATE menu_items SET description = NULL, price = '4.00' WHERE name = 'Snapple/Gatorade';

-- SUSHI MESS
UPDATE menu_items SET description = 'Kani, avocado, carrots and cucumbers', price = '11.50' WHERE name = 'Sushi Mess 1';
UPDATE menu_items SET description = 'Smoked salmon, kani, avocado, carrots & cucumber', price = '13.50' WHERE name = 'Sushi Mess 2';
UPDATE menu_items SET description = 'Spicy tuna, avocado, carrots and cucumber', price = '12.50' WHERE name = 'Sushi Mess 3';
UPDATE menu_items SET description = 'Spicy salmon, avocado, carrots and cucumber', price = '12.50' WHERE name = 'Sushi Mess 4';
UPDATE menu_items SET description = 'Spicy kani, avocado, carrots and cucumber', price = '11.50' WHERE name = 'Sushi Mess 5';
UPDATE menu_items SET description = 'Choice of fresh tuna or fresh salmon with avocado, carrots and cucumber', price = '13.50' WHERE name = 'Sushi Mess 6';

-- SUSHI ROLLS
UPDATE menu_items SET description = NULL, price = '8.75' WHERE name = 'California Roll';
UPDATE menu_items SET description = NULL, price = '8.75' WHERE name = 'Boston Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Salmon Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Alaska Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Salmon Avocado Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Tuna Avocado Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Spicy Tuna Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Spicy Salmon Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Tuna Crunch Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Salmon Crunch Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Black Pepper Tuna Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Tuna Cucumber Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Salmon Cucumber Roll';
UPDATE menu_items SET description = NULL, price = '9.25' WHERE name = 'Spicy Salmon Avocado Roll';
UPDATE menu_items SET description = NULL, price = '12.50' WHERE name = 'Yellow Tail Roll';
UPDATE menu_items SET description = NULL, price = '12.50' WHERE name = 'Smoked Salmon Roll';
UPDATE menu_items SET description = 'Tuna, salmon, avocado and cucumber', price = '12.50' WHERE name = 'Newport Roll';
UPDATE menu_items SET description = NULL, price = '12.50' WHERE name = 'Philadelphia Roll';

-- VEGETABLE ROLLS
UPDATE menu_items SET description = 'Avocado, carrot and cucumber', price = '7.50' WHERE name = 'Classic Veggie Roll';
UPDATE menu_items SET description = 'Sweet potato, mushroom and cucumber', price = '8.25' WHERE name = 'Tri Veggie Roll';
UPDATE menu_items SET description = 'Avocado and shiitake mushroom', price = '7.50' WHERE name = 'Avocado Mushroom Roll';
UPDATE menu_items SET description = NULL, price = '6.50' WHERE name = 'Cucumber Roll';
UPDATE menu_items SET description = NULL, price = '6.50' WHERE name = 'Carrot Roll';
UPDATE menu_items SET description = NULL, price = '7.25' WHERE name = 'Avocado Roll';
UPDATE menu_items SET description = NULL, price = '7.25' WHERE name = 'Avocado and Cucumber';
UPDATE menu_items SET description = NULL, price = '7.50' WHERE name = 'Avocado and Mango Roll';
UPDATE menu_items SET description = NULL, price = '6.50' WHERE name = 'Mango Roll';

-- NIGIRI / SASHIMI
UPDATE menu_items SET description = '2 pieces', price = '4.50' WHERE name = 'Tuna' AND category = 'Nigiri / Sashimi';
UPDATE menu_items SET description = '2 pieces', price = '5.50' WHERE name = 'Smoked Salmon' AND category = 'Nigiri / Sashimi';
UPDATE menu_items SET description = '2 pieces', price = '5.50' WHERE name = 'Yellow Tail' AND category = 'Nigiri / Sashimi';
UPDATE menu_items SET description = '2 pieces', price = '4.50' WHERE name = 'Salmon' AND category = 'Nigiri / Sashimi';
UPDATE menu_items SET description = '2 pieces', price = '3.00' WHERE name = 'Kani' AND category = 'Nigiri / Sashimi';

-- SPECIALTY ROLLS
UPDATE menu_items SET description = 'Spicy salmon and spicy tuna topped with avocado', price = '17.50' WHERE name = 'M22 Roll';
UPDATE menu_items SET description = 'Spicy tuna, avocado topped w/ spicy kani drizzled w/ spicy & sweet sauce mayo', price = '18.50' WHERE name = 'Grand St Roll';
UPDATE menu_items SET description = 'Peppered tuna topped with tuna', price = '18.50' WHERE name = 'FDR Drive Roll';
UPDATE menu_items SET description = 'Salmon, tuna and avocado', price = '17.50' WHERE name = 'Cherry St Roll';
UPDATE menu_items SET description = 'California roll topped with tuna', price = '17.50' WHERE name = 'Orchard St Roll';
UPDATE menu_items SET description = 'Spicy tuna, spicy kani crunch topped w/ fried onions & spicy mayo', price = '17.50' WHERE name = 'East Broadway Roll';
UPDATE menu_items SET description = 'Kani topped with spicy kani', price = '17.50' WHERE name = 'Ultimate Kani Roll';
UPDATE menu_items SET description = 'Spicy kani and spicy tuna drizzled w/ spicy mayo & siracha sauce', price = '17.50' WHERE name = 'Dynamite Roll';
UPDATE menu_items SET description = 'Salmon topped with avocado', price = '17.50' WHERE name = 'Houston St';
UPDATE menu_items SET description = 'Spicy salmon topped with avocado', price = '17.50' WHERE name = 'Willet St';
UPDATE menu_items SET description = 'Spicy tuna wrapped with raw tuna', price = '18.50' WHERE name = 'Tuna²';
UPDATE menu_items SET description = 'Peppered tuna topped with avocado', price = '17.50' WHERE name = 'Essex St Roll';
UPDATE menu_items SET description = 'Peppered tuna, avocado topped with spicy tuna', price = '18.50' WHERE name = 'Suffolk St Roll';
UPDATE menu_items SET description = 'Tuna topped with peppered tuna', price = '18.50' WHERE name = 'Jackson St Roll';
UPDATE menu_items SET description = 'California roll topped with peppered tuna', price = '18.50' WHERE name = 'Henry St Roll';
UPDATE menu_items SET description = 'Spicy tuna topped with avocado', price = '17.50' WHERE name = 'Dragon Roll';
UPDATE menu_items SET description = 'Spicy tuna and avocado topped with raw tuna', price = '18.50' WHERE name = 'Red Dragon Roll';
UPDATE menu_items SET description = 'Tuna, salmon and avocado', price = '18.50' WHERE name = 'Sushi Sandwich';
UPDATE menu_items SET description = 'Spicy tuna topped with spicy kani and avocado', price = '18.50' WHERE name = 'Manhattan Bridge Roll';
UPDATE menu_items SET description = 'Spicy salmon topped with salmon', price = '18.50' WHERE name = 'Atlantic Ocean Roll';
UPDATE menu_items SET description = 'Tuna and salmon topped with yellow tail', price = '21.00' WHERE name = 'The Carlton Roll';
UPDATE menu_items SET description = 'California topped with tuna, salmon and yellow tail', price = '18.50' WHERE name = 'The Park Roll';
UPDATE menu_items SET description = 'Avocado, cucumber topped with tuna and salmon', price = '18.50' WHERE name = 'The Brooklyn Bridge Roll';
UPDATE menu_items SET description = 'Tuna, salmon and kani with avocado and cucumber', price = '18.50' WHERE name = 'King Roll';
UPDATE menu_items SET description = 'Kani and avocado topped with spicy tuna', price = '18.50' WHERE name = 'The Main Avenue Roll';
UPDATE menu_items SET description = 'California roll topped with spicy kani', price = '17.50' WHERE name = 'The Clifton Roll';
UPDATE menu_items SET description = 'Salmon, kani and avocado topped with mango and sweet sauce', price = '17.50' WHERE name = 'The Florida Roll';
UPDATE menu_items SET description = 'Avocado topped with salmon', price = '16.50' WHERE name = 'The Prince Roll';
UPDATE menu_items SET description = 'Spicy tuna, avocado topped with seared salmon and sweet sauce', price = '18.50' WHERE name = 'The Bentley Roll';
UPDATE menu_items SET description = 'California roll topped with avocado, tuna and salmon', price = '18.50' WHERE name = 'Rainbow Roll';
UPDATE menu_items SET description = 'Spicy yellowtail, cucumber topped with horseradish sauce and masago', price = '17.50' WHERE name = 'Manhattan Roll';
UPDATE menu_items SET description = 'Salmon topped with avocado and tuna', price = '18.50' WHERE name = 'Brooklyn Roll';
UPDATE menu_items SET description = 'Tuna topped with avocado and salmon', price = '18.50' WHERE name = 'Queens Roll';
UPDATE menu_items SET description = 'Tuna topped with salmon', price = '18.50' WHERE name = 'East River Roll';
UPDATE menu_items SET description = 'Salmon topped with tuna', price = '18.50' WHERE name = 'Hudson River Roll';

-- TEMPURA ROLLS
UPDATE menu_items SET description = 'Tuna, salmon and kani drizzled with spicy mayo, sweet sauce and masago', price = '18.75' WHERE name = 'Godzilla Roll';
UPDATE menu_items SET description = 'Kani roll drizzled with spicy mayo, sweet sauce and masago', price = '16.00' WHERE name = 'Delancey Roll';
UPDATE menu_items SET description = 'Spicy salmon, spicy tuna and avocado drizzled with spicy mayo and sweet sauce', price = '17.50' WHERE name = 'Williamsburg Bridge Roll';
UPDATE menu_items SET description = 'Salmon, cucumber and avocado drizzled with spicy mayo and sweet sauce', price = '17.50' WHERE name = 'Canal St Roll';
UPDATE menu_items SET description = 'Salmon, avocado and cucumber wrapped with avocado drizzled with sweet sauce', price = '17.50' WHERE name = 'Lower East Side Roll';
UPDATE menu_items SET description = 'Salmon kani and shredded carrots with sweet sauce', price = '18.00' WHERE name = 'Spider Roll';
UPDATE menu_items SET description = 'Salmon and avocado and crunch topped with sweet sauce', price = '17.50' WHERE name = 'Crunchy Roll';
UPDATE menu_items SET description = 'Sweet potato and avocado drizzled with sweet sauce', price = '13.00' WHERE name = 'Sweet Potato Tempura';
UPDATE menu_items SET description = 'Breaded and fried kani, avocado and cucumber', price = '17.50' WHERE name = 'Southern California Roll';
UPDATE menu_items SET description = NULL, price = '12.00' WHERE name = 'Fried Kani Sticks';

-- SUSHI PLATTERS
UPDATE menu_items SET description = '6 rolls: 3 vegetable rolls, 3 sushi rolls', price = '26.00' WHERE name = 'Small Platter';
UPDATE menu_items SET description = '10 rolls: 4 vegetable rolls, 6 sushi rolls', price = '36.00' WHERE name = 'Medium Platter';
UPDATE menu_items SET description = '15 rolls: 7 vegetable rolls, 8 sushi rolls', price = '48.00' WHERE name = 'Large Platter';
UPDATE menu_items SET description = '15 rolls: 6 vegetable, 5 sushi, 4 specialty rolls', price = '48.00' WHERE name = 'Especially Large Platter';
UPDATE menu_items SET description = '15 rolls: 6 vegetable, 5 sushi, 4 specialty with sashimi & nigiri', price = '75.00' WHERE name = 'Extra Special Platter';

-- ============================================================
-- VERIFY COUNTS AFTER RUNNING
-- Run these SELECT statements to confirm everything updated
-- ============================================================

-- SELECT COUNT(*) FROM menu_items WHERE description IS NOT NULL;
-- SELECT name, description, price FROM menu_items WHERE category = 'Specialty Rolls' ORDER BY sort_order;
-- SELECT name, description, price FROM menu_items WHERE category = 'Sushi Mess';
-- SELECT name, description, price FROM menu_items WHERE name IN ('Chulent', 'Israeli Salad', 'Snapple/Gatorade', 'Hot N Spicy Schnitzel Wrap');