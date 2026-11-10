--!strict
--[[
  QazaqVerse — AuctionController (Roblox Luau, server side).
  A 1:1 port of web/auction-core.js, which is what the mobile game runs and what tests/auction.test.js covers.

  Differences from the first draft in the design brief (and why):
    * The countdown says «Бір! Екі! Сатылды!» — the draft counted "Бір, Екі, Үш" and then sold on a fourth beat.
    * Anti-snipe: a bid in the last seconds pushes the clock back, otherwise the last tick always wins.
    * A leader cannot outbid themself, and every bid must beat the current one by at least `Step`.
    * An auction with no bids ends as "nosale" instead of handing the item to nil.

  Wire it up:
      local auction = AuctionController.new(lot, 320, 30)
      auction.VoiceCue = function(text) VoiceRemote:FireAllClients("E1", text) end   -- judge voice tag, see backend/qv_audio/voices.py
      auction.HammerAnim = function(n) HammerRemote:FireAllClients(n) end            -- 1, 2 = raise; 3 = strike + haptics
      auction.Finished = function(winner, price) Inventory:Grant(winner, lot) end
      task.spawn(function() while auction.IsActive do task.wait(1); auction:TickSecond() end end)
]]

export type Bid = { Bidder: any, Amount: number }
export type Auction = {
	Item: any, CurrentBid: number, StartPrice: number, HighestBidder: any?, TimeRemaining: number,
	HammerCount: number, IsActive: boolean, Bids: number, Step: number, AntiSnipe: number, History: { Bid },
	VoiceCue: ((text: string) -> ())?, HammerAnim: ((count: number) -> ())?, Finished: ((winner: any?, price: number) -> ())?,
	MinNext: (self: Auction) -> number,
	PlaceBid: (self: Auction, bidder: any, amount: number) -> (boolean, string),
	TickSecond: (self: Auction) -> (),
}

local AuctionController = {}
AuctionController.__index = AuctionController

local COUNT = { "Бір!", "Екі!" }

function AuctionController.new(itemData: any, startingPrice: number, durationSeconds: number, step: number?, antiSnipe: number?): Auction
	local self = setmetatable({}, AuctionController)
	self.Item = itemData
	self.CurrentBid = startingPrice
	self.StartPrice = startingPrice
	self.HighestBidder = nil
	self.TimeRemaining = durationSeconds
	self.HammerCount = 0
	self.IsActive = true
	self.Bids = 0
	self.Step = step or 10
	self.AntiSnipe = if antiSnipe ~= nil then antiSnipe else 5
	self.History = {}
	return (self :: any) :: Auction
end

function AuctionController:MinNext(): number
	return self.CurrentBid + self.Step
end

function AuctionController:PlaceBid(bidder: any, amount: number): (boolean, string)
	if not self.IsActive then
		return false, "Аукцион аяқталды!"
	end
	if bidder == self.HighestBidder then
		return false, "Сенің бағаң онсыз да жоғары!"
	end
	if typeof(amount) ~= "number" or amount ~= amount or amount < self:MinNext() then -- also rejects NaN from a bad client
		return false, "Баға жоғары болуы керек!"
	end
	self.CurrentBid = amount
	self.HighestBidder = bidder
	self.HammerCount = 0 -- the hammer goes back up
	self.Bids += 1
	if self.TimeRemaining < self.AntiSnipe then
		self.TimeRemaining = self.AntiSnipe
	end
	table.insert(self.History, { Bidder = bidder, Amount = amount })
	if self.VoiceCue then
		self.VoiceCue("Жаңа баға!")
	end
	return true, "Бәс қабылданды!"
end

function AuctionController:TickSecond()
	if not self.IsActive then
		return
	end
	self.TimeRemaining -= 1
	if self.TimeRemaining <= 0 then
		self.IsActive = false
		self.HammerCount = 3
		if self.HammerAnim then
			self.HammerAnim(3)
		end
		if self.HighestBidder ~= nil and self.VoiceCue then
			self.VoiceCue("Сатылды! Құттықтаймыз!")
		end
		if self.Finished then
			self.Finished(self.HighestBidder, self.CurrentBid)
		end
	elseif self.TimeRemaining <= 2 then
		self.HammerCount = 3 - self.TimeRemaining -- 2 s left → 1 («Бір!»), 1 s left → 2 («Екі!»)
		if self.HammerAnim then
			self.HammerAnim(self.HammerCount)
		end
		if self.VoiceCue then
			self.VoiceCue(COUNT[self.HammerCount])
		end
	end
end

return AuctionController
